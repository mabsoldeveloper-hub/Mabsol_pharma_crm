"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";

export default function CompanyListPage() {

  const [companies, setCompanies] =
    useState<any[]>([]);

  const loadCompanies = async () => {

    const res = await fetch(
      "/api/company-master"
    );

    const data = await res.json();

    setCompanies(data);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const deleteCompany = async (
    id: string
  ) => {

    if (
      !confirm(
        "Delete this company?"
      )
    ) {
      return;
    }

    await fetch(
      `/api/company-master/${id}`,
      {
        method: "DELETE",
      }
    );

    loadCompanies();
  };

  return (
    <ProtectedPage permission="company.view" >
      
    <div className="card shadow border-0">

      <div className="card-body">

        <div className="d-flex justify-content-between mb-3">

          <h3>
            Company List
          </h3>

          <Link
            href="/dashboard/company/create"
            className="btn btn-primary"
          >
            Add Company
          </Link>

        </div>

        <table className="table table-bordered">

          <thead>

            <tr>
              <th>Code</th>
              <th>Company</th>
              <th>Owner</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Status</th>
              <th width="180">
                Action
              </th>
            </tr>

          </thead>

          <tbody>

            {companies.map((row) => (

              <tr key={row._id}>

                <td>
                  {row.companyCode}
                </td>

                <td>
                  {row.companyName}
                </td>

                <td>
                  {row.ownerName}
                </td>

                <td>
                  {row.email}
                </td>

                <td>
                  {row.mobile}
                </td>

                <td>
                  {row.status}
                </td>

                <td>

                  <Link
                    href={`/dashboard/company/edit/${row._id}`}
                    className="btn btn-warning btn-sm me-2"
                  >
                    Edit
                  </Link>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() =>
                      deleteCompany(
                        row._id
                      )
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

    </ProtectedPage>
  );
}