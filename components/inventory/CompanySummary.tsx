"use client";

//import DataTable from "../common/DataTable";

export default function CompanySummary({ products }: any) {

  const companies = Object.values(

    products.reduce((obj: any, p: any) => {

      const company =
        p.companyName || "Unknown";

      if (!obj[company]) {

        obj[company] = {

          company,

          totalProducts: 0,

          stock: 0,

          stockValue: 0,

        };

      }

      obj[company].totalProducts++;

      obj[company].stock += Number(
        p.BALANCE || 0
      );

      obj[company].stockValue +=

        Number(p.BALANCE || 0) *

        Number(p.PRATE || 0);

      return obj;

    }, {})

  ).sort(

    (a: any, b: any) =>

      b.stockValue - a.stockValue

  );

  return (

    <div className="card shadow border-0">

      <div className="card-header bg-info text-white">

        <h5 className="mb-0">

          Company Wise Inventory

        </h5>

      </div>

      <div className="card-body p-0">

        <div className="table-responsive">

          {/* <DataTable id="CompanySummary"> */}
          <table className="table table-hover align-middle mb-0">

            <thead>

              <tr>

                <th>Company</th>

                <th className="text-center">

                  Products

                </th>

                <th className="text-end">

                  Stock

                </th>

                <th className="text-end">

                  Stock Value

                </th>

              </tr>

            </thead>

            <tbody>

              {

                companies.map((c: any, index) => (

                  <tr key={index}>

                    <td>

                      <b>

                        {c.company}

                      </b>

                    </td>

                    <td className="text-center">

                      {c.totalProducts}

                    </td>

                    <td className="text-end">

                      {Number(c.stock).toLocaleString()}

                    </td>

                    <td className="text-end">

                      ₹{" "}

                      {Number(

                        c.stockValue

                      ).toLocaleString("en-IN", {

                        maximumFractionDigits: 2,

                      })}

                    </td>

                  </tr>

                ))

              }

            </tbody>

            </table>

        </div>

      </div>

    </div>

  );

}