import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Notification from "@/models/Notification";
import { runNotificationAlertScan } from "@/lib/notificationEngine";

export const dynamic = "force-dynamic";

// GET notifications for current user
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const roleType = (user.roleType || user.role || "Admin").toString();
    const isAdminOrManager = ["Admin", "SuperAdmin", "Manager", "RSM", "ZSM"].includes(roleType);
    const userIdStr = String(user._id);
    const userNameStr = (user.name || "").trim().toLowerCase();
    const empCodeStr = (user.employeeCode || "").trim().toLowerCase();

    let query: any = {};

    if (!isAdminOrManager) {
      // MR Executive: Show general stock/system alerts PLUS targets strictly assigned to this MR
      const mrTargetConditions: any[] = [
        { userId: userIdStr },
        { "metadata.mrUserId": userIdStr },
      ];

      if (userNameStr) {
        mrTargetConditions.push({ "metadata.mrName": { $regex: userNameStr, $options: "i" } });
      }
      if (empCodeStr) {
        mrTargetConditions.push({ "metadata.mrName": { $regex: empCodeStr, $options: "i" } });
      }

      query = {
        $or: [
          // Non-target alerts (Stock & System)
          { category: { $ne: "TARGETS" }, targetRole: { $in: ["All", "MR"] } },
          // Target alerts strictly assigned to this MR
          { category: "TARGETS", $or: mrTargetConditions },
        ],
      };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH to mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, { $set: { isRead: true } });
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    }

    return NextResponse.json({ success: false, error: "notificationId or markAllRead required" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update notification" },
      { status: 500 }
    );
  }
}
