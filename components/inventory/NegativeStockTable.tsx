"use client";

import Link from "next/link";
//import DataTable from "@/components/common/DataTable";

export default function NegativeStockTable({ products }: any) {
  return (
    <div className="card shadow border-0 h-100">

      <div className="card-header bg-danger text-white">

        <h5 className="mb-0">
          Negative Stock Products
        </h5>

      </div>

      <div className="card-body p-0">

        <div className="table-responsive">

        {/* <DataTable id="negativeStockTable"> */}
          <table className="table table-hover align-middle mb-0">

            <thead className="table-light">

              <tr>

                <th>Product</th>

                <th className="text-center">Stock</th>

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

                    <td className="text-center">

                      <span className="badge bg-danger">

                        {Number(p.BALANCE).toLocaleString()}

                      </span>

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
                    colSpan={4}
                    className="text-center text-success py-4"
                  >

                    🎉 No Negative Stock

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