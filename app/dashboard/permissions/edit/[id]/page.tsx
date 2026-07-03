"use client";

import {useEffect, useState,} from "react";
import {useParams,useRouter,} from "next/navigation";

export default function EditPermissionPage() {

  const { id } = useParams();
  const router = useRouter();

  const [form,setForm]=useState({
    moduleName:"",
    permissionName:"",
    permissionKey:"",
    status:"Active",
  });

  useEffect(() => {
    loadPermission();
  }, []);

  const loadPermission =
    async () => {

      const res =
        await fetch(
          `/api/permissions/${id}`
        );

      const data =
        await res.json();

      setForm(data);

    };

  const updatePermission =
    async () => {

      await fetch(
        `/api/permissions/${id}`,
        {

          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(form),

        }
      );

      alert(
        "Permission Updated"
      );

      router.push(
        "/dashboard/permissions"
      );

    };

  return (

    <div className="card shadow">

      <div className="card-body">

        <h3>
          Edit Permission
        </h3>

        <hr />

        <div className="mb-3">

          <label>
            Module
          </label>

          <input
            className="form-control"
            value={
              form.moduleName
            }
            onChange={(e) =>
              setForm({
                ...form,
                moduleName:
                  e.target.value,
              })
            }
          />

        </div>

        <div className="mb-3">

          <label>
            Permission
          </label>

          <input
            className="form-control"
            value={
              form.permissionName
            }
            onChange={(e) =>
              setForm({
                ...form,
                permissionName:
                  e.target.value,
              })
            }
          />

        </div>

        <div className="mb-3">
            <label>Permission Key</label>
            <input className="form-control" value={form.permissionKey}
            onChange={(e)=>
              setForm({
                ...form,
                permissionKey:e.target.value,
              })
              }
            />
        </div>

        <div className="mb-3">

          <label>
            Status
          </label>

          <select
            className="form-control"
            value={
              form.status
            }
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
          onClick={
            updatePermission
          }
        >
          Update Permission
        </button>

      </div>

    </div>

  );

}