import {NextRequest, NextResponse,} from "next/server";
  
  import connectDB from "@/lib/mongodb";
  
  import UserPermission from "@/models/UserPermission";
  
  export async function POST(
    req: NextRequest
  ) {
    try {
  
      await connectDB();
  
      const body = await req.json();
  
      // Remove Old Permissions
  
      await UserPermission.deleteMany({
        userId: body.userId,
      });
  
      // Insert New Permissions
  
      if (
        body.permissions &&
        body.permissions.length > 0
      ) {
        await UserPermission.insertMany(
          body.permissions
        );
      }
  
      return NextResponse.json({
        success: true,
      });
  
    } catch (error: any) {
  
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
  
    }
  }