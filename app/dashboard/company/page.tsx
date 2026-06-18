"use client";

import { useEffect, useState } from "react";

export default function CompanyListPage() {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const res = await fetch("/api/company");
    const data = await res.json();

    setCompanies(data || []);
  };

  const deleteCompany = async (id: string) => {
    if (!confirm("Delete Company?")) return;

    await fetch(`/api/company/${id}`, {
      method: "DELETE",
    });

    loadCompanies();
  };

  return (
    <div className="card shadow border-0">

      <div className="card-body">

        <h3>Company List</h3>

        <hr />

        <table className="table table-bordered table-hover">

          <thead>
            <tr>
              <th>Code</th>
              <th>Company Name</th>
              <th>Owner</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {companies.map((row: any) => (
              <tr key={row._id}>

                <td>{row.companyCode}</td>
                <td>{row.companyName}</td>
                <td>{row.ownerName}</td>
                <td>{row.email}</td>
                <td>{row.mobile}</td>

                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() =>
                      deleteCompany(row._id)
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