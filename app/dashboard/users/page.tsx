import DeleteUserButton from "@/components/DeleteUserButton";
import PermissionButton from "@/components/PermissionButton";
import ProtectedPage from "@/components/ProtectedPage";
import Link from "next/link";

async function getUsers() {

  const res = await fetch("http://localhost:3000/api/users",
    {
      cache: "no-store",
    }
  );

  const data = await res.json();
  return data.users;
}

export default async function UsersPage() {

  const users = await getUsers();

  return(
     <ProtectedPage permission="users.view">

    <div className="card shadow border-0">
      <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">

            <h3> Users Management </h3>
            <PermissionButton permission="users.create" >
              <Link href="/dashboard/users/create" className="btn btn-primary"> + Create User </Link>
            </PermissionButton>

          </div>

          <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Photo</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    <th>Action</th>
                 </tr>
                </thead>

                <tbody>
                  {
                  users.map((user:any)=>(
                    <tr key={user._id}>
                      <td>
                        <img src={ user.profilePhoto || "/avatar.png"}
                          width="45"
                          height="45"
                          style={{
                            borderRadius:"50%",
                            objectFit:"cover",
                          }}
                          alt=""
                        />
                      </td>
                      <td>
                        {user.employeeCode}
                      </td>
                      <td>
                        {user.name}
                      </td>
                      <td>
                        {user.email}
                      </td>
                      <td>
                        {user.companyId?.companyName}
                      </td>
                      <td>
                        {user.roleId?.roleName}
                      </td>
                      <td>
                        {user.department}
                      </td>
                      <td>
                        {user.designation}
                      </td>
                      <td>
                        {user.mobile}
                      </td>
                      <td>
                        {user.status==="Active" ? <span className="badge bg-success"> Active </span>
                        :
                        <span className="badge bg-danger"> Inactive </span>
                        }
                      </td>
                      <td>
                        <div className="d-flex gap-2">

                          <PermissionButton permission="users.edit" >
                            <Link href={`/dashboard/users/edit/${user._id}`} className="btn btn-warning btn-sm"> Edit </Link>
                          </PermissionButton>

                            <Link href={`/dashboard/users/permission/${user._id}`} className="btn btn-info btn-sm">  Permission </Link>
                          

                          <PermissionButton permission="users.delete" >
                            <DeleteUserButton userId={user._id.toString()} />
                          </PermissionButton>
                        </div>
                      </td>
                    </tr>

                  ))
                  }
                </tbody>
              </table>
          </div>

        </div>
    </div>

  </ProtectedPage>

  );

}
