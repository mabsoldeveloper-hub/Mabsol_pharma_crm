"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function EditCompanyPage() {

  const params = useParams();

  const id = params.id;

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] =
    useState<any>({});

  useEffect(() => {

    if (id) {
      loadCompany();
    }

  }, [id]);

  const loadCompany =
    async () => {

      const res = await fetch(
        `/api/company-master/${id}`
      );

      const data =
        await res.json();

      setForm(data);
    };

  const updateCompany =
    async () => {

      try {

        setLoading(true);

        await fetch(
          `/api/company-master/${id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              form
            ),
          }
        );

        alert(
          "Company Updated"
        );

      } catch {

        alert(
          "Update Failed"
        );

      } finally {

        setLoading(false);
      }
    };

  return (
    <div className="card shadow border-0">

      <div className="card-body">

        <h3>
          Edit Company
        </h3>

        <hr />

        <div className="row g-3">

          <div className="col-md-6">
            <label> Company Name  </label>
            <input className="form-control"
             value={
                form.companyName || ""
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  companyName:
                    e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>
              Owner Name
            </label>

            <input
              className="form-control"
              value={
                form.ownerName || ""
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  ownerName:
                    e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>Email</label>

            <input
              className="form-control"
              value={
                form.email || ""
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  email:
                    e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>Mobile</label>

            <input
              className="form-control"
              value={
                form.mobile || ""
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  mobile:
                    e.target.value,
                })
              }
            />
          </div>

        </div>

        <button
          className="btn btn-success mt-4"
          onClick={
            updateCompany
          }
          disabled={loading}
        >
          {loading
            ? "Updating..."
            : "Update Company"}
        </button>

      </div>

    </div>
  );
}