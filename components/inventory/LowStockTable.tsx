"use client";

export default function LowStockTable({ products }: any) {

  return (

    <div className="card shadow border-0 h-100">

      <div className="card-header bg-warning text-dark">

        <h5 className="mb-0">
          Low Stock Products
        </h5>

      </div>

      <div className="card-body p-0">

        <div className="table-responsive">

          <table className="table table-hover mb-0">

            <thead className="table-light">

              <tr>

                <th>Product</th>

                <th className="text-center">Stock</th>

                <th className="text-end">MRP</th>

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

                      <span className="badge bg-warning text-dark">

                        {Number(p.BALANCE).toLocaleString()}

                      </span>

                    </td>

                    <td className="text-end">

                      ₹ {Number(p.MRP || 0).toLocaleString()}

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={3}
                    className="text-center text-muted py-4"
                  >

                    No Low Stock Product

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