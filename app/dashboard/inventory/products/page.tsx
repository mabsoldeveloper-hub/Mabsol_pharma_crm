"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProductsPage() {

  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {

    const s = search.toLowerCase();

    setFiltered(

      products.filter((p: any) =>

        (p.PRODUCT || "").toLowerCase().includes(s) ||

        String(p.CODE || "").toLowerCase().includes(s) ||

        (p.GCODE || "").toLowerCase().includes(s)

      )

    );

  }, [search, products]);

  const totalProducts = filtered.length;

  const activeProducts = filtered.filter(
    (p: any) => p.STATUS === "Y"
  ).length;
  
  const inactiveProducts = filtered.filter(
    (p: any) => p.STATUS !== "Y"
  ).length;
  
  const totalCompanies = new Set(
    filtered
      .map((p: any) => p.companyName || p.GCODE)
      .filter(Boolean)
  ).size;
  
  const lowStock = filtered.filter(
    (p: any) => Number(p.BALANCE) > 0 && Number(p.BALANCE) <= 10
  ).length;
  
  const outOfStock = filtered.filter(
    (p: any) => Number(p.BALANCE) <= 0
  ).length;
  
  const totalStock = filtered.reduce(
    (sum: number, p: any) => sum + Number(p.BALANCE || 0),
    0
  );
  
  const totalStockValue = filtered.reduce(
    (sum: number, p: any) =>
      sum + Number(p.BALANCE || 0) * Number(p.PRATE || 0),
    0
  );




  const loadProducts = async () => {

    const res = await fetch("/api/products");

    const data = await res.json();

    setProducts(data);
    setFiltered(data);

  };

  return (

    <div className="card shadow">
      <div className="card-body">
        <div className="row g-3 mb-4">
          <div className="col-lg-3 col-md-6">
              <div className="card bg-primary text-white shadow border-0">
                  <div className="card-body text-center">
                      <h6>Total Products</h6>
                      <h2>{totalProducts}</h2>
                  </div>
              </div>
          </div>

          <div className="col-lg-3 col-md-6">
              <div className="card bg-success text-white shadow border-0">
                  <div className="card-body text-center">
                      <h6>Active Products</h6>
                      <h2>{activeProducts}</h2>
                  </div>
              </div>
          </div>

    <div className="col-lg-3 col-md-6">
        <div className="card bg-danger text-white shadow border-0">
            <div className="card-body text-center">
                <h6>Inactive Products</h6>
                <h2>{inactiveProducts}</h2>
            </div>
        </div>
    </div>

    <div className="col-lg-3 col-md-6">
        <div className="card bg-warning shadow border-0">
            <div className="card-body text-center">
                <h6>Total Companies</h6>
                <h2>{totalCompanies}</h2>
            </div>
        </div>
    </div>

    <div className="col-lg-3 col-md-6">
        <div className="card bg-info text-white shadow border-0">
            <div className="card-body text-center">
                <h6>Low Stock</h6>
                <h2>{lowStock}</h2>
            </div>
        </div>
    </div>

    <div className="col-lg-3 col-md-6">
        <div className="card bg-dark text-white shadow border-0">
            <div className="card-body text-center">
                <h6>Out Of Stock</h6>
                <h2>{outOfStock}</h2>
            </div>
        </div>
    </div>

    <div className="col-lg-3 col-md-6">
        <div className="card bg-secondary text-white shadow border-0">
            <div className="card-body text-center">
                <h6>Total Stock</h6>
                <h2>{totalStock.toLocaleString()}</h2>
            </div>
        </div>
    </div>

    <div className="col-lg-3 col-md-6">
        <div className="card bg-success text-white shadow border-0">
            <div className="card-body text-center">
                <h6>Stock Value</h6>
                <h5>
                    ₹ {totalStockValue.toLocaleString("en-IN", {
                        maximumFractionDigits: 2
                    })}
                </h5>
            </div>
        </div>
    </div>

</div>

        {/* <div className="d-flex justify-content-between align-items-center mb-3">

          <h3 className="mb-0">
            Product Master
          </h3>

          <span className="badge bg-primary fs-6">
            Total : {filtered.length}
          </span>

        </div> */}

        <div className="row mb-3">

          <div className="col-md-4">

            <input
              className="form-control"
              placeholder="Search Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

          </div>

        </div>

        <div className="table-responsive">

          <table className="table table-bordered table-hover align-middle">

            <thead className="table-dark">

              <tr>

                <th>Code</th>

                <th>Product</th>

                <th>Company</th>

                <th>MRP</th>

                <th>Purchase</th>

                <th>Sale</th>

                <th>Stock</th>

                <th>GST</th>

                <th>Status</th>

                <th>Action</th>

              </tr>

            </thead>

            <tbody>

              {

                filtered.map((p: any) => (

                  <tr key={p._id}>

                    <td>{p.CODE}</td>

                    <td>{p.PRODUCT}</td>

                    {/* <td>{p.GCODE}</td> */}
                    <td>{p.companyName || p.GCODE}</td>

                    <td>₹ {Number(p.MRP || 0).toFixed(2)}</td>

                    <td>₹ {Number(p.PRATE || 0).toFixed(2)}</td>

                    <td>₹ {Number(p.RATEF || 0).toFixed(2)}</td>

                    <td>

                      {

                        p.BALANCE < 0 ?

                          <span className="text-danger fw-bold">

                            {p.BALANCE}

                          </span>

                          :

                          p.BALANCE <= 10 ?

                            <span className="text-warning fw-bold">

                              {p.BALANCE}

                            </span>

                            :

                            <span className="text-success fw-bold">

                              {p.BALANCE}

                            </span>

                      }

                    </td>

                    <td>

                      {p.IGST}%

                    </td>

                    <td>

                      {

                        p.STATUS == "Y"

                          ?

                          <span className="badge bg-success">

                            Active

                          </span>

                          :

                          <span className="badge bg-danger">

                            Inactive

                          </span>

                      }

                    </td>

                    <td>

                      <Link
                        href={`/dashboard/inventory/products/view/${p._id}`}
                        className="btn btn-primary btn-sm"
                      >
                        View
                      </Link>

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