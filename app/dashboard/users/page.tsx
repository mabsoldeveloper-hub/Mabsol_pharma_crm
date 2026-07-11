import DeleteUserButton from "@/components/DeleteUserButton";
import PermissionButton from "@/components/PermissionButton";
import ProtectedPage from "@/components/ProtectedPage";
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
            <h3>
              Users Management
            </h3>

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

          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead>
                <tr>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Photo
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Code
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Name
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Email
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Company
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Role
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Department
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Designation
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Mobile
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Status
                  </th>
                  <th style={{ background: "#343872", color: "#fff" }}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map((user: any) => (
                  <tr key={user._id}>
                    <td>
                      <img
                        src={user.profilePhoto || "/avatar.png"}
                        width="45"
                        height="45"
                        alt=""
                        style={{
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid #343872",
                        }}
                      />
                    </td>

                    <td>{user.employeeCode}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.companyId?.companyName}</td>
                    <td>{user.roleId?.roleName}</td>
                    <td>{user.department}</td>
                    <td>{user.designation}</td>
                    <td>{user.mobile}</td>

                    <td>
                      {user.status === "Active" ? (
                        <span className="badge bg-success">Active</span>
                      ) : (
                        <span className="badge bg-danger">Inactive</span>
                      )}
                    </td>

                    <td>
                      <div className="d-flex gap-2">
                        <PermissionButton permission="users.edit">
                          <Link
                            href={`/dashboard/users/edit/${user._id}`}
                            className="btn btn-sm"
                            style={{
                              background: "#fb8c00",
                              color: "#fff",
                              border: "none",
                            }}
                          >
                            Edit
                          </Link>
                        </PermissionButton>

                        <Link
                          href={`/dashboard/users/permission/${user._id}`}
                          className="btn btn-sm"
                          style={{
                            background: "#343872",
                            color: "#fff",
                            border: "none",
                          }}
                        >
                          Permission
                        </Link>

                        <PermissionButton permission="users.delete">
                          <DeleteUserButton
                            userId={user._id.toString()}
                          />
                        </PermissionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
