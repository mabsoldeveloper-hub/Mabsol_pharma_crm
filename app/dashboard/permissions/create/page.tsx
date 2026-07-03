"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePermissionPage() {

  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] = useState({

    moduleName: "",

    permissionName: "",

    permissionKey: "",

    status: "Active",

  });

  // Auto Generate Permission Key

  const generateKey = (
    moduleName: string,
    permissionName: string
  ) => {

    const module =
      moduleName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");

    let action = "";

    const text =
      permissionName.toLowerCase();

    if (text.includes("view"))
      action = "view";

    else if (text.includes("create"))
      action = "create";

    else if (text.includes("add"))
      action = "create";

    else if (text.includes("edit"))
      action = "edit";

    else if (text.includes("update"))
      action = "edit";

    else if (text.includes("delete"))
      action = "delete";

    else if (text.includes("export"))
      action = "export";

    else if (text.includes("print"))
      action = "print";

    else
      action = permissionName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");

    return `${module}.${action}`;

  };

  const savePermission = async () => {

    setLoading(true);

    await fetch("/api/permissions", {

      method: "POST",

      headers: {

        "Content-Type":
          "application/json",

      },

      body: JSON.stringify(form),

    });

    alert("Permission Created");

    router.push("/dashboard/permissions");

  };

  return (

    <div className="card shadow">

      <div className="card-body">

        <h3>Create Permission</h3>

        <hr />

        {/* Module */}

        <div className="mb-3">

          <label>Module</label>

          <input

            className="form-control"

            value={form.moduleName}

            onChange={(e) => {

              const moduleName =
                e.target.value;

              setForm({

                ...form,

                moduleName,

                permissionKey:
                  generateKey(
                    moduleName,
                    form.permissionName
                  ),

              });

            }}

          />

        </div>

        {/* Permission */}

        <div className="mb-3">

          <label>Permission</label>

          <input

            className="form-control"

            value={form.permissionName}

            onChange={(e) => {

              const permissionName =
                e.target.value;

              setForm({

                ...form,

                permissionName,

                permissionKey:
                  generateKey(
                    form.moduleName,
                    permissionName
                  ),

              });

            }}

          />

        </div>

        {/* Permission Key */}

        <div className="mb-3">

          <label>

            Permission Key

          </label>

          <input

            className="form-control"

            value={form.permissionKey}

            onChange={(e) =>

              setForm({

                ...form,

                permissionKey:
                  e.target.value,

              })

            }

          />

          <small className="text-muted">

            Example :
            users.view

          </small>

        </div>

        {/* Status */}

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

          onClick={savePermission}

        >

          {

            loading

              ? "Saving..."

              : "Save Permission"

          }

        </button>

      </div>

    </div>

  );

}