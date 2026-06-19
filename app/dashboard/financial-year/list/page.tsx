"use client";

import {
  useEffect,
  useState,
} from "react";

const setCurrentFY = async (
  row: any
) => {

  await fetch(
    "/api/financial-year/set-current",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        companyId:
          row.companyId._id,
        fyId:
          row._id,
      }),
    }
  );

  localStorage.setItem(
    "currentFY",
    row._id
  );

  loadData();
};

export default function FYListPage() {

  const [years, setYears] =
    useState<any[]>([]);

    const loadData = async () => {

      const res =
        await fetch(
          "/api/financial-year"
        );
    
      const data =
        await res.json();
    
      setYears(data);
    
    };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="card shadow border-0">

      <div className="card-body">

        <h3>
          Financial Years
        </h3>

        <hr />

        <table className="table table-bordered">

        <thead>
<tr>
<th>Company</th>
<th>FY</th>
<th>Start Date</th>
<th>End Date</th>
<th>Current FY</th>
<th>Status</th>
<th width="220">
Action
</th>
</tr>
</thead>

          <tbody>

            {years.map(
              (row) => (

                <tr
                  key={row._id}
                >

                  <td>
                    {row.companyId?.companyName}
                  </td>

                  <td>
                    {
                      row.fyName
                    }
                  </td>

                  <td>
                    {
                      new Date(
                        row.startDate
                      )
                      .toLocaleDateString()
                    }
                  </td>

                  <td>
                    {
                      new Date(
                        row.endDate
                      )
                      .toLocaleDateString()
                    }
                  </td>

                  <td>
  {row.isCurrent
    ? "✅"
    : ""}
</td>

<td>
  {row.status}
</td>

<td>

<button
 className={
  row.isCurrent
   ? "btn btn-success btn-sm me-2"
   : "btn btn-outline-success btn-sm me-2"
 }
 disabled={row.isCurrent}
 onClick={() =>
  setCurrentFY(row)
 }
>
 {row.isCurrent
   ? "✓ Current"
   : "Set Current"}
</button>

{/* <a
 href={`/dashboard/financial-year/edit/${row._id}`}
 className="btn btn-warning btn-sm me-2"
>
Edit
</a> */}

<button
 className="btn btn-danger btn-sm"
 onClick={async () => {

  if (
   !confirm(
    "Delete FY ?"
   )
  )
   return;

  await fetch(
   `/api/financial-year/${row._id}`,
   {
    method:"DELETE",
   }
  );

  loadData();
 }}
>
Delete
</button>

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