"use client";

import { useEffect, useState } from "react";

export default function CreateFYPage() {

  const [companies, setCompanies] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] =
    useState({
      companyId: "",
      fyName: "",
      startDate: "",
      endDate: "",
      isCurrent: true,
    });

  useEffect(() => {

    fetch("/api/company-master")
      .then((res) => res.json())
      .then((data) =>
        setCompanies(data)
      );

  }, []);

  const saveFY = async () => {

    try {

      setLoading(true);

      await fetch(
        "/api/financial-year",
        {
          method: "POST",

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
        "Financial Year Created"
      );

      setForm({
        companyId: "",
        fyName: "",
        startDate: "",
        endDate: "",
        isCurrent: true,
      });

    } catch {

      alert(
        "Error"
      );

    } finally {

      setLoading(false);

    }

  };

  return (
    <div className="card shadow border-0">

      <div className="card-body">

        <h3>
          Create Financial Year
        </h3>

        <hr />

        <div className="row g-3">

          <div className="col-md-6">

            <label>
              Company
            </label>

            <select
              className="form-control"
              value={form.companyId}
              onChange={(e) =>
                setForm({
                  ...form,
                  companyId:
                    e.target.value,
                })
              }
            >
              <option value="">
                Select Company
              </option>

              {companies.map(
                (c) => (
                  <option
                    key={c._id}
                    value={c._id}
                  >
                    {
                      c.companyName
                    }
                  </option>
                )
              )}

            </select>

          </div>

          <div className="col-md-6">

            <label>
              FY Name
            </label>

            <input
              className="form-control"
              placeholder="2025-26"
              value={
                form.fyName
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  fyName:
                    e.target.value,
                })
              }
            />

          </div>

          <div className="col-md-6">

            <label>
              Start Date
            </label>

            <input
              type="date"
              className="form-control"
              value={
                form.startDate
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  startDate:
                    e.target.value,
                })
              }
            />

          </div>

          <div className="col-md-6">

            <label>
              End Date
            </label>

            <input
              type="date"
              className="form-control"
              value={
                form.endDate
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  endDate:
                    e.target.value,
                })
              }
            />

          </div>

        </div>

        <button
          className="btn btn-primary mt-4"
          onClick={saveFY}
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : "Create FY"}
        </button>

      </div>

    </div>
  );
}