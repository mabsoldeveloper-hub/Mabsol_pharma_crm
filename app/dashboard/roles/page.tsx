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
    if (!confirm("Delete this Role?")) return;

    await fetch(`/api/roles/${id}`, {
      method: "DELETE",
    });

    alert("Role Deleted");
    loadRoles();
  };

  const filtered = roles.filter(
    (x) =>
      x.roleName?.toLowerCase().includes(search.toLowerCase()) ||
      x.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="card shadow border-0"
      style={{
        borderRadius: "16px",
      }}
    >
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3
            style={{
              color: "#343872",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Role Master
          </h3>

          <Link
            href="/dashboard/roles/create"
            className="btn"
            style={{
              background: "#343872",
              color: "#fff",
              border: "none",
            }}
          >
            + Create Role
          </Link>
        </div>

        <input
          className="form-control mb-3"
          placeholder="Search Role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            borderColor: "#343872",
          }}
        />

        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead>
              <tr>
                <th style={{ background: "#343872", color: "#fff" }}>
                  Role Name
                </th>

                <th style={{ background: "#343872", color: "#fff" }}>
                  Description
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
              {filtered.map((row) => (
                <tr key={row._id}>
                  <td>{row.roleName}</td>

                  <td>{row.description}</td>

                  <td>
                    {row.status === "Active" ? (
                      <span className="badge bg-success">Active</span>
                    ) : (
                      <span className="badge bg-danger">Inactive</span>
                    )}
                  </td>

                  <td>
                    <div className="d-flex flex-nowrap gap-2">
                      <Link
                        href={`/dashboard/roles/permission/${row._id}`}
                        className="btn btn-sm"
                        style={{
                          background: "#343872",
                          color: "#fff",
                          border: "none",
                        }}
                      >
                        Permission
                      </Link>

                      <Link
                        href={`/dashboard/roles/edit/${row._id}`}
                        className="btn btn-sm"
                        style={{
                          background: "#fb8c00",
                          color: "#fff",
                          border: "none",
                        }}
                      >
                        Edit
                      </Link>

                      <button
                        className="btn btn-sm"
                        onClick={() => deleteRole(row._id)}
                        style={{
                          background: "#dc3545",
                          color: "#fff",
                          border: "none",
                        }}
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