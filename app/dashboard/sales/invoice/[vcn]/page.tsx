"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InvoiceView() {

    const { vcn } = useParams();

    const router = useRouter();

    const [invoice, setInvoice] = useState<any>(null);

    useEffect(() => {

        loadInvoice();

    }, []);

    const loadInvoice = async () => {

        const res = await fetch(`/api/sales/invoice/${vcn}`);

        const data = await res.json();

        setInvoice(data);

    };

    if (!invoice) {

        return (
            <div className="container mt-5 text-center">

                Loading Invoice...

            </div>
        );

    }

    const h = invoice.header;

    const c = invoice.customer;

    const s = invoice.summary;

    return (

        <div className="container-fluid mt-4">

            <div className="d-flex justify-content-between mb-3">

                <h3>

                    Invoice Details

                </h3>

                <div>

                    <button
                        className="btn btn-secondary me-2"
                        onClick={() => router.back()}
                    >
                        Back
                    </button>

                    <button
                        className="btn btn-primary"
                        onClick={() => window.print()}
                    >
                        Print
                    </button>

                </div>

            </div>

            {/* Header */}

            <div className="card shadow mb-4">

                <div className="card-header bg-primary text-white">

                    Invoice Information

                </div>

                <div className="card-body">

                    <div className="row">

                        <div className="col-md-3">

                            <strong>Invoice No</strong>

                            <br />

                            {h.VCN}

                        </div>

                        <div className="col-md-3">

                            <strong>Date</strong>

                            <br />

                            {h.DATE}

                        </div>

                        <div className="col-md-3">

                            <strong>Type</strong>

                            <br />

                            {h.TYPE}

                        </div>

                        <div className="col-md-3">

                            <strong>Voucher</strong>

                            <br />

                            {h.VOUCHER}

                        </div>

                    </div>

                </div>

            </div>

            {/* Customer */}

            <div className="card shadow mb-4">

                <div className="card-header bg-success text-white">

                    Customer Information

                </div>

                <div className="card-body">

                    <div className="row">

                        <div className="col-md-6">

                            <strong>Name</strong>

                            <br />

                            {c?.PARNAM}

                        </div>

                        <div className="col-md-3">

                            <strong>City</strong>

                            <br />

                            {c?.CITY || "-"}

                        </div>

                        <div className="col-md-3">

                            <strong>GST</strong>

                            <br />

                            {c?.GSTNO || "-"}

                        </div>

                    </div>

                </div>

            </div>

            {/* Products */}

            <div className="card shadow">

                <div className="card-header bg-dark text-white">

                    Product Details

                </div>

                <div className="card-body p-0">

                    <table className="table table-bordered table-striped mb-0">

                        <thead>

                            <tr>

                                <th>#</th>

                                <th>Product</th>

                                <th>Company</th>

                                <th>Batch</th>

                                <th>Expiry</th>

                                <th>Qty</th>

                                <th>Free</th>

                                <th>Rate</th>

                                <th>MRP</th>

                                <th>Tax</th>

                                <th>Amount</th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                invoice.items.map(

                                    (item: any, i: number) => (

                                        <tr key={i}>

                                            <td>

                                                {i + 1}

                                            </td>

                                            <td>

                                                {item.product}

                                            </td>

                                            <td>

                                                {item.company}

                                            </td>

                                            <td>

                                                {item.batch}

                                            </td>

                                            <td>

                                                {item.expiry}

                                            </td>

                                            <td>

                                                {item.qty}

                                            </td>

                                            <td>

                                                {item.free}

                                            </td>

                                            <td>

                                                {item.rate}

                                            </td>

                                            <td>

                                                {item.mrp}

                                            </td>

                                            <td>

                                                {item.tax}

                                            </td>

                                            <td>

                                                {item.amount}

                                            </td>

                                        </tr>

                                    )

                                )

                            }

                        </tbody>

                    </table>

                </div>

            </div>

            {/* Summary */}

            <div className="row mt-4">

                <div className="col-md-4 ms-auto">

                    <table className="table table-bordered">

                        <tbody>

                            <tr>

                                <th>Taxable</th>

                                <td>{s.taxable}</td>

                            </tr>

                            <tr>

                                <th>CGST</th>

                                <td>{s.cgst}</td>

                            </tr>

                            <tr>

                                <th>SGST</th>

                                <td>{s.sgst}</td>

                            </tr>

                            <tr>

                                <th>Tax</th>

                                <td>{s.tax}</td>

                            </tr>

                            <tr>

                                <th>Round Off</th>

                                <td>{s.round}</td>

                            </tr>

                            <tr className="table-success">

                                <th>Grand Total</th>

                                <th>{s.total}</th>

                            </tr>

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    );

}