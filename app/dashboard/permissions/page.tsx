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
    if (!confirm("Delete Permission?")) return;

    await fetch(`/api/permissions/${id}`, {
      method: "DELETE",
    });

    loadPermissions();
  };

  const filtered = permissions.filter(
    (x) =>
      x.moduleName?.toLowerCase().includes(search.toLowerCase()) ||
      x.permissionName?.toLowerCase().includes(search.toLowerCase()) ||
      x.permissionKey?.toLowerCase().includes(search.toLowerCase())
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
            Permission Master
          </h3>

          <Link
            href="/dashboard/permissions/create"
            className="btn"
            style={{
              background: "#343872",
              color: "#fff",
              border: "none",
            }}
          >
            + Add Permission
          </Link>
        </div>

        <input
          className="form-control mb-3"
          placeholder="Search..."
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
                  Module
                </th>
                <th style={{ background: "#343872", color: "#fff" }}>
                  Permission
                </th>
                <th style={{ background: "#343872", color: "#fff" }}>
                  Permission Key
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
                  <td>{row.moduleName}</td>

                  <td>{row.permissionName}</td>

                  <td>
                    <span
                      className="badge"
                      style={{
                        background: "#343872",
                        color: "#fff",
                      }}
                    >
                      {row.permissionKey}
                    </span>
                  </td>

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
                        href={`/dashboard/permissions/edit/${row._id}`}
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
                        onClick={() => deletePermission(row._id)}
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