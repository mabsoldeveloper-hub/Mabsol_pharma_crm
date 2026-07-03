"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

export default function EditRolePage() {

  const { id } = useParams();

  const router = useRouter();

  const [form, setForm] =
    useState({

      roleName: "",

      description: "",

      status: "Active",

    });

  useEffect(() => {

    loadRole();

  }, []);

  const loadRole =
    async () => {

      const res =
        await fetch(`/api/roles/${id}`);

      const data =
        await res.json();

      setForm(data);

    };

  const updateRole =
    async () => {

      await fetch(`/api/roles/${id}`, {

        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(form),

      });

      alert("Role Updated");

      router.push("/dashboard/roles");

    };

  return (

    <div className="card shadow">

      <div className="card-body">

        <h3>Edit Role</h3>

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
            <option>Active</option>
            <option>Inactive</option>
          </select>

        </div>

        <button
          className="btn btn-primary"
          onClick={updateRole}
        >
          Update Role
        </button>

      </div>

    </div>

  );

}