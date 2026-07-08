"use client";

import Link from "next/link";

export default function TopProductsTable({ products }: any) {

  return (

    <div className="card shadow border-0 h-100">

      <div className="card-header bg-primary text-white">

        <h5 className="mb-0">

          Top Products By Stock

        </h5>

      </div>

      <div className="card-body p-0">

        <div className="table-responsive">

          <table className="table table-hover table-striped align-middle mb-0">

            <thead className="table-light">

              <tr>

                <th>Product</th>

                <th>Company</th>

                <th className="text-center">Stock</th>

                <th className="text-end">Purchase</th>

                <th className="text-end">MRP</th>

                <th>View</th>

              </tr>

            </thead>

            <tbody>

              {products?.length > 0 ? (

                products.map((p: any) => (

                  <tr key={p._id}>

                    <td>

                      <b>{p.PRODUCT}</b>

                    </td>

                    <td>

                      {p.GCODE || "-"}

                    </td>

                    <td className="text-center">

                      <span className={`badge ${
                        p.BALANCE < 0
                          ? "bg-danger"
                          : p.BALANCE <= 10
                          ? "bg-warning text-dark"
                          : "bg-success"
                      }`}>

                        {Number(p.BALANCE).toLocaleString()}

                      </span>

                    </td>

                    <td className="text-end">

                      ₹ {Number(p.PRATE || 0).toLocaleString()}

                    </td>

                    <td className="text-end">

                      ₹ {Number(p.MRP || 0).toLocaleString()}

                    </td>

                    <td>

                      <Link
                        href={`/dashboard/inventory/products/view/${p._id}`}
                        className="btn btn-sm btn-outline-primary"
                      >

                        View

                      </Link>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={6}
                    className="text-center py-4 text-muted"
                  >

                    No Products Found

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  );

}