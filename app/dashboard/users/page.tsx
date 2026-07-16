import PermissionButton from "@/components/PermissionButton";
import ProtectedPage from "@/components/ProtectedPage";
import UsersTable from "@/components/UsersTable";
import Link from "next/link";

async function getUsers() {
  const res = await fetch("http://localhost:3000/api/users", {
    cache: "no-store",
  });

  const data = await res.json();
  return data.users;
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <ProtectedPage permission="users.view">
      <div
        className="card shadow border-0"
        style={{
          borderRadius: "16px",
        }}
      >
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>Users Management</h3>

            <PermissionButton permission="users.create">
              <Link
                href="/dashboard/users/create"
                className="btn"
                style={{
                  background: "#343872",
                  color: "#fff",
                  border: "none",
                }}
              >
                + Create User
              </Link>
            </PermissionButton>
          </div>

          <UsersTable users={users} />
        </div>
      </div>
    </ProtectedPage>
  );
}