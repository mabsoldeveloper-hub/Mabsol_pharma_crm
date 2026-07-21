"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function VoucherPage() {
  const params = useParams();

  const voucher = params.voucher as string;

  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!voucher) return;

    fetch(`/api/voucher/${voucher}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [voucher]);

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary"></div>
        <h5 className="mt-3">Loading Voucher...</h5>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          Voucher not found.
        </div>
      </div>
    );
  }

  const colorMap: any = {
    S: "primary",
    P: "success",
    R: "warning",
    B: "danger",
    W: "warning",
    Q: "danger",
    U: "danger",
    u: "warning",
    T: "danger",
    t: "warning",
    J: "secondary",
  };

  const titleMap: any = {
    S: "Sales Invoice",
    P: "Purchase Invoice",
    R: "Sales Return (Credit Note)",
    B: "Purchase Return (Debit Note)",
    W: "Sales Return (Break/Expiry)",
    Q: "Purchase Return (Break/Expiry)",
    U: "Price Difference Debit Note",
    u: "Price Difference Credit Note",
    T: "Purchase Price Difference Debit Note",
    t: "Purchase Price Difference Credit Note",
    J: "Journal Voucher",
  };

  const color =
    colorMap[data.header.type] || "dark";

  const title =
    titleMap[data.header.type] || "Voucher";

  return (
    <div className="container-fluid py-4">

      {/* Header */}

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>

          <h3 className={`text-${color} fw-bold`}>
            {title}
          </h3>

          <small className="text-muted">
            Universal ERP Voucher Viewer
          </small>

        </div>

        <div>

          <Link
            href="javascript:history.back()"
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

      {/* Voucher */}

      <div className="card shadow border-0 mb-4">

        <div
          className={`card-header bg-${color} text-white`}
        >
          Voucher Information
        </div>

        <div className="card-body">

          <div className="row">

            <div className="col-md-3">

              <small>Voucher No</small>

              <h5>{data.header.voucherNo}</h5>

            </div>

            <div className="col-md-3">

              <small>Date</small>

              <h5>{data.header.date}</h5>

            </div>

            <div className="col-md-3">

              <small>Voucher Type</small>

              <h5>{title}</h5>

            </div>

            <div className="col-md-3">

              <small>Amount</small>

              <h4 className="text-success">
                ₹
                {Number(
                  data.header.final
                ).toLocaleString()}
              </h4>

            </div>

          </div>

        </div>

      </div>

      {/* Customer */}

      <div className="card shadow border-0 mb-4">

        <div className="card-header">
          Party Information
        </div>

        <div className="card-body">

          <div className="row">

            <div className="col-md-4">

              <small>Party</small>

              <h5>
                {data.customer?.name}
              </h5>

            </div>

            <div className="col-md-2">

              <small>Code</small>

              <h6>
                {data.customer?.code}
              </h6>

            </div>

            <div className="col-md-2">

              <small>City</small>

              <h6>
                {data.customer?.city}
              </h6>

            </div>

            <div className="col-md-2">

              <small>GST</small>

              <h6>
                {data.customer?.gst}
              </h6>

            </div>

            <div className="col-md-2">

              <small>DL</small>

              <h6>
                {data.customer?.dl}
              </h6>

            </div>

          </div>

        </div>

      </div>

      {/* Items */}

      <div className="card shadow border-0">

        <div className="card-header">

          Items

        </div>

        <div className="table-responsive">

          <table className="table table-hover mb-0">

            <thead className="table-dark">

              <tr>

                <th>#</th>

                <th>Product</th>

                <th>Batch</th>

                <th>Expiry</th>

                <th>Qty</th>

                <th>Free</th>

                <th>Rate</th>

                <th>MRP</th>

                <th>Amount</th>

              </tr>

            </thead>

            <tbody>

              {data.items.map(
                (row: any, index: number) => (
                  <tr key={index}>

                    <td>{index + 1}</td>

                    <td>

                      <b>{row.product}</b>

                      <br />

                      <small>
                        {row.packing}
                      </small>

                    </td>

                    <td>{row.batch}</td>

                    <td>{row.exp}</td>

                    <td>{row.qty}</td>

                    <td>{row.free}</td>

                    <td>
                      {row.rate}
                    </td>

                    <td>
                      {row.mrp}
                    </td>

                    <td className="text-end">

                      ₹
                      {Number(
                        row.amount
                      ).toLocaleString()}

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* Totals */}

      <div className="row mt-4">

        <div className="col-lg-4 offset-lg-8">

          <div className="card shadow">

            <div className="card-body">

              <table className="table">

                <tbody>

                  <tr>

                    <td>Total Qty</td>

                    <td className="text-end">
                      {data.totals.qty}
                    </td>

                  </tr>

                  <tr>

                    <td>Total Free</td>

                    <td className="text-end">
                      {data.totals.free}
                    </td>

                  </tr>

                  <tr>

                    <td>Tax</td>

                    <td className="text-end">

                      ₹
                      {Number(
                        data.taxes.totalTax
                      ).toLocaleString()}

                    </td>

                  </tr>

                  <tr className="table-primary">

                    <th>Grand Total</th>

                    <th className="text-end">

                      ₹
                      {Number(
                        data.header.final
                      ).toLocaleString()}

                    </th>

                  </tr>

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}