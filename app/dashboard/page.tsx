import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";

import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const token = cookieStore.get("token")?.value;

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
    <div>
      <h1>Dashboard</h1>

      <h3>Welcome Company Admin</h3>

      <LogoutButton />
    </div>
  );
}