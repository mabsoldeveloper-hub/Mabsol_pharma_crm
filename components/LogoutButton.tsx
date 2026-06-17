"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
  };

  return (
    <button
      onClick={logout}
      className="btn btn-danger btn-sm"
    >
      Logout
    </button>
  );
}