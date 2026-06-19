import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";

import DashboardCards from "@/components/DashboardCards";
import RevenueChart from "@/components/RevenueChart";
import QuickActions from "@/components/QuickActions";
import RecentActivity from "@/components/RecentActivity";

export default async function DashboardPage() {

  const cookieStore = await cookies();
  const token =
    cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );
  } catch {
    redirect("/login");
  }

  return (
      <DashboardCards />
  );
}