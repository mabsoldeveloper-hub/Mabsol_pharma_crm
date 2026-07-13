"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CustomerLedgerPage() {
  const params = useParams();
  const id = params.id as string;
 // const code = params.code as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;



fetch(`/api/customers/ledger/${id}`)
    

      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary"></div>
          <p className="mt-3">Loading Ledger...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          Ledger not found.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold">
            Customer Ledger
          </h3>

          <small className="text-muted">
            Complete Ledger Statement
          </small>
        </div>

        <div>
          <Link
            href="/dashboard/customers"
            className="btn btn-secondary me-2"
          >
            Back
          </Link>

          <button
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      </div>

      {/* Customer Card */}

      {/* <div className="card shadow mb-4">
        <div className="card-header bg-primary text-white">
          Customer Information
        </div>
        <div className="card-body">

          <div className="row">

            <div className="col-md-4">
              <strong>Name</strong>
              <br />
              {data.customer?.name}
            </div>

            <div className="col-md-2">
              <strong>Code</strong>
              <br />
              {data.customer?.code}
            </div>

            <div className="col-md-2">
              <strong>City</strong>
              <br />
              {data.customer?.city || "-"}
            </div>

            <div className="col-md-2">
              <strong>GST</strong>
              <br />
              {data.customer?.gst || "-"}
            </div>

            <div className="col-md-2">
              <strong>Balance</strong>
              <br />

              <span className="fw-bold text-danger">
                ₹{Number(data.customer?.currentBalance || 0)}
              </span>
            </div>
          </div>
        </div>
      </div> */}

<div className="card shadow-sm border-0 mb-4">
  <div className="card-header bg-primary text-white fw-bold">
    Customer Information
  </div>

  <div className="card-body">
    <div className="row g-4">

      <div className="col-md-4">
        <small className="text-muted">Customer Name</small>
        <h5 className="fw-bold mb-0">
          {data.customer?.name}
        </h5>
      </div>

      <div className="col-md-2">
        <small className="text-muted">Code</small>
        <h6>{data.customer?.code}</h6>
      </div>

      <div className="col-md-2">
        <small className="text-muted">City</small>
        <h6>{data.customer?.city || "-"}</h6>
      </div>

      <div className="col-md-2">
        <small className="text-muted">GST No</small>
        <h6>{data.customer?.gst || "-"}</h6>
      </div>

      <div className="col-md-2">
        <small className="text-muted">Current Balance</small>

        <h5 className="text-danger fw-bold">
          ₹
          {Number(
            data.customer?.currentBalance || 0
          ).toLocaleString()}
        </h5>

      </div>

    </div>
  </div>
</div>

      {/* Summary */}

      <div className="row mb-4">

        <div className="col-md-4">

          <div className="card shadow">

            <div className="card-body text-center">

              <h6>Total Sales</h6>

              <h3 className="text-success">

                ₹
                {Number(
                  data.summary?.sale || 0
                ).toLocaleString()}
                

              </h3>

            </div>

          </div>

        </div>

        <div className="col-md-4">

          <div className="card shadow">

            <div className="card-body text-center">

              <h6>Total Bills</h6>

              <h3>
                    
                {data.ledger?.length || 0}

              </h3>

            </div>

          </div>

        </div>

        <div className="col-md-4">

          <div className="card shadow">

            <div className="card-body text-center">

              <h6>Current Balance</h6>

              <h3 className="text-danger">

                ₹
                
                {Number(data.summary?.closing || 0).toLocaleString()}

              </h3>

            </div>

          </div>

        </div>

      </div>

      {/* Ledger */}

      <div className="card shadow">

        <div className="card-header bg-dark text-white">

          Ledger Entries

        </div>

        <div className="table-responsive">

          <table className="table table-bordered table-hover mb-0">

            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Voucher</th>
                <th>Bill No</th>
                <th>Particulars</th>
                <th className="text-end">Debit</th>
                <th className="text-end">Credit</th>
                <th className="text-end">Balance</th>
              </tr>
            </thead>

            <tbody>

              {data.ledger?.length > 0 ? (

                data.ledger.map((row: any, index: number) => (

                  <tr key={index}>
                  <td>{row.date}</td>
                
                  <td>
                    <span className="fw-bold text-primary">
                      {row.voucher}
                    </span>
                  </td>
                
                  <td>{row.billNo || "-"}</td>
                
                  <td>{row.particulars}</td>
                
                  <td className="text-end text-danger">
                    {row.debit > 0
                      ? Number(row.debit).toLocaleString()
                      : "-"}
                  </td>
                
                  <td className="text-end text-success">
                    {row.credit > 0
                      ? Number(row.credit).toLocaleString()
                      : "-"}
                  </td>
                
                  <td className="text-end fw-bold">
                    {Number(row.balance).toLocaleString()}
                  </td>
                </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={6}
                    className="text-center py-4"
                  >
                    No Ledger Found
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