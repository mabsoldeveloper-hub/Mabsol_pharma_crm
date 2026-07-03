"use client";

import { useRouter } from "next/navigation";

interface Props {
  userId: string;
}

export default function DeleteUserButton({
  userId,
}: Props) {
  const router = useRouter();

  const deleteUser = async () => {
    const ok = confirm(
      "Are you sure you want to delete this user?"
    );

    if (!ok) return;

    const res = await fetch(
      `/api/users/${userId}`,
      {
        method: "DELETE",
      }
    );

    const data = await res.json();

    if (data.success) {
      alert("User Deleted Successfully");

      router.refresh(); // Refresh Server Component
    } else {
      alert(data.error || "Delete Failed");
    }
  };

  return (
    <button
      className="btn btn-danger btn-sm"
      onClick={deleteUser}
    >
      Delete
    </button>
  );
}