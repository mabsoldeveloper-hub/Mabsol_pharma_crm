"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PermissionListPage() {

  const [permissions, setPermissions] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const loadPermissions = async () => {

    const res = await fetch("/api/permissions");
    const data = await res.json();

    setPermissions(data);

  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const deletePermission = async (id: string) => {

    if (!confirm("Delete Permission?"))
      return;

    await fetch(`/api/permissions/${id}`, {
      method: "DELETE",
    });

    loadPermissions();

  };

  const filtered = permissions.filter((x) =>

    x.moduleName
      ?.toLowerCase()
      .includes(search.toLowerCase()) ||
  
    x.permissionName
      ?.toLowerCase()
      .includes(search.toLowerCase()) ||
  
    x.permissionKey
      ?.toLowerCase()
      .includes(search.toLowerCase())
  
  );

  return (

    <div className="card shadow border-0">

      <div className="card-body">

        <div className="d-flex justify-content-between mb-3">

          <h3>
            Permission Master
          </h3>

          <Link
            href="/dashboard/permissions/create"
            className="btn btn-primary"
          >
            + Add Permission
          </Link>

        </div>

        <input
          className="form-control mb-3"
          placeholder="Search..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <div className="table-responsive">
        <table className="table table-bordered table-hover">

          <thead>

            <tr>
            <th>Module</th>
            <th>Permission</th>
            <th>Permission Key</th>
            <th>Status</th>
             
            <th width="180">
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {filtered.map((row) => (

              <tr key={row._id}>

                <td>
                  {row.moduleName}
                </td>

                <td>
                  {row.permissionName}
                </td>
                <td>
                  <span className="badge bg-secondary">
                    {row.permissionKey}
                  </span>
                </td>
                <td>
                  {
                    row.status==="Active"
                    ?
                    <span className="badge bg-success">Active</span>
                    :
                    <span className="badge bg-danger">Inactive</span>
                  }
                </td>

                {/* <td>

                  <Link
                    href={`/dashboard/permissions/edit/${row._id}`}
                    className="btn btn-warning btn-sm me-2"
                  >
                    Edit
                  </Link>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() =>
                      deletePermission(row._id)
                    }
                  >
                    Delete
                  </button>

                </td> */}
                <td>
                    <div className="d-flex flex-nowrap gap-2">

                        <Link
                        href={`/dashboard/permissions/edit/${row._id}`}
                        className="btn btn-warning btn-sm"
                        >
                        Edit
                        </Link>

                        <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deletePermission(row._id)}
                        >
                        Delete
                        </button>

                    </div>
                </td>

              </tr>

            ))}

          </tbody>

        </table>
        </div>    
      </div>

    </div>

  );
}