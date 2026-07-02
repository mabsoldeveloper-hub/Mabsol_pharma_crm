"use client";

import Link from "next/link";

export default function CustomerHeader({
  customer,
}: any) {

  return (

    <div className="card shadow border-0 mb-4">

      <div className="card-body">

        <div className="row align-items-center">

          {/* Customer Image */}

          <div className="col-lg-2 text-center">

            <img
              src="/avatar.png"
              alt="Customer"
              width="130"
              height="130"
              className="rounded-circle border shadow"
              style={{
                objectFit: "cover",
              }}
            />

          </div>

          {/* Customer Details */}

          <div className="col-lg-7">

            <div className="d-flex align-items-center gap-3">

              <h2 className="fw-bold mb-0">

                {customer.PARNAM}

              </h2>

              {

                customer.STATUS === "Y"

                ?

                <span className="badge bg-success">

                  Active

                </span>

                :

                <span className="badge bg-danger">

                  Inactive

                </span>

              }

            </div>

            <hr />

            <div className="row">

              <div className="col-md-4 mb-3">

                <small className="text-muted">

                  Customer Code

                </small>

                <div className="fw-bold">

                  {customer.CODEP}

                </div>

              </div>

              <div className="col-md-4 mb-3">

                <small className="text-muted">

                  GST Number

                </small>

                <div className="fw-bold">

                  {customer.GSTNO || "-"}

                </div>

              </div>

              <div className="col-md-4 mb-3">

                <small className="text-muted">

                  Drug License

                </small>

                <div className="fw-bold">

                  {customer.DLNO || "-"}

                </div>

              </div>

              <div className="col-md-4 mb-3">

                <small className="text-muted">

                  Mobile

                </small>

                <div className="fw-bold">

                  {customer.PHONE1 || "-"}

                </div>

              </div>

              <div className="col-md-4 mb-3">

                <small className="text-muted">

                  City

                </small>

                <div className="fw-bold">

                  {customer.CITY || "-"}

                </div>

              </div>

              <div className="col-md-4 mb-3">

                <small className="text-muted">

                  Contact Person

                </small>

                <div className="fw-bold">

                  {customer.REF || "-"}

                </div>

              </div>

            </div>

          </div>

          {/* Right Side Buttons */}
          

          {/* <div className="col-lg-3">

            <div className="d-grid gap-2">

              <Link
                href={`/dashboard/customers/edit/${customer._id}`}
                className="btn btn-warning"
              >
                ✏ Edit Customer
              </Link>

              <button className="btn btn-success">

                📒 Ledger

              </button>

              <button className="btn btn-info text-white">

                🧾 Statement

              </button>

              <button className="btn btn-primary">

                ➕ New Order

              </button>

              <button className="btn btn-secondary">

                🖨 Print

              </button>

            </div>

          </div> */}

        </div>

      </div>

    </div>

  );

}