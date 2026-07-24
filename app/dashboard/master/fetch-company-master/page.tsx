"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Company {
  _id: string;
  companyCode: string;
  companyName: string;
  status: string;
}

export default function FetchCompanyMasterPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filtered, setFiltered] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!search) {
      setFiltered(companies);
      return;
    }

    const keyword = search.toLowerCase();

    setFiltered(
      companies.filter(
        (c) =>
          c.companyCode.toLowerCase().includes(keyword) ||
          c.companyName.toLowerCase().includes(keyword)
      )
    );
  }, [search, companies]);

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/master/fetch-company-master");
      const json = await res.json();

      if (json.success) {
        setCompanies(json.data);
        setFiltered(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const total = companies.length;
  const active = companies.filter((x) => x.status === "Active").length;
  const inactive = companies.filter((x) => x.status === "Inactive").length;

  return (
    <div className="container-fluid py-3">

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Fetch Company Master</h3>

        <Link
          href="/dashboard/division-master"
          className="btn btn-primary"
        >
          Next →
        </Link>
      </div>

      {/* Cards */}

      <div className="row mb-4">

        <div className="col-md-4">
          <div className="card shadow-sm border-0">
            <div className="card-body text-center">
              <h6>Total Companies</h6>
              <h3>{total}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm border-0">
            <div className="card-body text-center">
              <h6>Active</h6>
              <h3 className="text-success">{active}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm border-0">
            <div className="card-body text-center">
              <h6>Inactive</h6>
              <h3 className="text-danger">{inactive}</h3>
            </div>
          </div>
        </div>

      </div>

      {/* Search */}

      <div className="card shadow-sm">

        <div className="card-header d-flex justify-content-between align-items-center">

          <input
            type="text"
            className="form-control w-25"
            placeholder="Search Company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

        </div>

        <div className="card-body p-0">

          <table className="table table-bordered table-hover mb-0">

            <thead className="table-light">

              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Company Code</th>
                <th>Company Name</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4">
                    No Company Found
                  </td>
                </tr>
              ) : (
                filtered.map((company, index) => (
                  <tr key={company._id}>
                    <td>{index + 1}</td>
                    <td>{company.companyCode}</td>
                    <td>{company.companyName}</td>
                    <td>
                      <span
                        className={`badge ${
                          company.status === "Active"
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                      >
                        {company.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}