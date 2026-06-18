"use client";

import { useEffect, useState } from "react";

export default function ListCompany() {

  const [companies, setCompanies] =
    useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {

    const res =
      await fetch(
        "/api/company-master"
      );

    const data =
      await res.json();

    setCompanies(data);
  };

  return (
    <div className="card shadow">

      <div className="card-body">

        <h3>Company List</h3>

        <table className="table">

          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Owner</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {companies.map(
              (row: any) => (

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
                    {row.status}
                  </td>
                </tr>
              )
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}