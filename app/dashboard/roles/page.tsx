"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function RolesPage() {

  const [roles, setRoles] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const loadRoles = async () => {

    const res = await fetch("/api/roles");
    const data = await res.json();

    setRoles(data);

  };

  useEffect(() => {
    loadRoles();
  }, []);

  const deleteRole = async (id: string) => {

    if (!confirm("Delete this Role?"))
      return;

    await fetch(`/api/roles/${id}`, {
      method: "DELETE",
    });

    alert("Role Deleted");

    loadRoles();

  };

  const filtered = roles.filter(
    (x) =>
      x.roleName
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      x.description
        ?.toLowerCase()
        .includes(search.toLowerCase())
  );

  return (

    <div className="card shadow border-0">

      <div className="card-body">

        <div className="d-flex justify-content-between mb-3">

          <h3>Role Master</h3>

          <Link
            href="/dashboard/roles/create"
            className="btn btn-primary"
          >
            + Create Role
          </Link>

        </div>

        <input
          className="form-control mb-3"
          placeholder="Search Role..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <table className="table table-bordered table-hover">

          <thead>

            <tr>

              <th>Role Name</th>

              <th>Description</th>

              <th>Status</th>

              <th>
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {filtered.map((row) => (

              <tr key={row._id}>

                <td>
                  {row.roleName}
                </td>

                <td>
                  {row.description}
                </td>

                <td>
                  {row.status}
                </td>

                <td>

                  <Link
                    href={`/dashboard/roles/permission/${row._id}`}
                    className="btn btn-success btn-sm me-2"
                  >
                    Permission
                  </Link>

                  <Link
                    href={`/dashboard/roles/edit/${row._id}`}
                    className="btn btn-warning btn-sm me-2"
                  >
                    Edit
                  </Link>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() =>
                      deleteRole(row._id)
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}