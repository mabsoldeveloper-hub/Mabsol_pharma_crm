"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateRolePage() {

  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] = useState({

    tenantId: "TENANT001",

    roleName: "",

    description: "",

    status: "Active",

  });

  const saveRole = async () => {

    setLoading(true);

    await fetch("/api/roles", {

      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(form),

    });

    alert("Role Created");

    router.push("/dashboard/roles");

  };

  return (

    <div className="card shadow">

      <div className="card-body">

        <h3>Create Role</h3>

        <hr />

        <div className="mb-3">

          <label>Role Name</label>

          <input
            className="form-control"
            value={form.roleName}
            onChange={(e) =>
              setForm({
                ...form,
                roleName:
                  e.target.value,
              })
            }
          />

        </div>

        <div className="mb-3">

          <label>Description</label>

          <textarea
            rows={3}
            className="form-control"
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value,
              })
            }
          />

        </div>

        <div className="mb-3">

          <label>Status</label>

          <select
            className="form-control"
            value={form.status}
            onChange={(e) =>
              setForm({
                ...form,
                status:
                  e.target.value,
              })
            }
          >
            <option>
              Active
            </option>

            <option>
              Inactive
            </option>

          </select>

        </div>

        <button
          className="btn btn-primary"
          disabled={loading}
          onClick={saveRole}
        >
          {loading
            ? "Saving..."
            : "Save Role"}
        </button>

      </div>

    </div>

  );

}