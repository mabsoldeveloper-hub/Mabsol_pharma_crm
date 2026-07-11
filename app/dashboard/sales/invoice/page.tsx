
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function InvoicePage() {

    const [invoices, setInvoices] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {

        loadInvoices();

    }, []);

    useEffect(() => {

        const s = search.toLowerCase();

        setFiltered(

            invoices.filter((row: any) =>

                String(row.vcn || "")
                    .toLowerCase()
                    .includes(s)

                ||

                String(row.customer || "")
                    .toLowerCase()
                    .includes(s)

                ||

                String(row.city || "")
                    .toLowerCase()
                    .includes(s)

            )

        );

    }, [search, invoices]);

    const loadInvoices = async () => {

        const res = await fetch("/api/sales/invoice");

        const data = await res.json();

        setInvoices(data);

        setFiltered(data);

    };

    // Dashboard Cards

    const totalBills = filtered.length;

    const totalSale = filtered.reduce(

        (sum: number, row: any) =>

            sum + Number(row.total || 0),

        0

    );

    const totalTaxable = filtered.reduce(

        (sum: number, row: any) =>

            sum + Number(row.taxable || 0),

        0

    );

    const totalTax = filtered.reduce(

        (sum: number, row: any) =>

            sum + Number(row.tax || 0),

        0

    );

    const salesBills = filtered.filter(

        (x: any) => x.type === "S"

    ).length;

    const purchaseBills = filtered.filter(

        (x: any) => x.type === "P"

    ).length;

    const returnBills = filtered.filter(

        (x: any) => x.type === "R"

    ).length;

    return (

        <div className="container-fluid">

            <div className="row mb-4">

                <div className="col-lg-3">

                    <div className="card bg-primary text-white">

                        <div className="card-body text-center">

                            <h6>Total Bills</h6>

                            <h2>

                                {totalBills}

                            </h2>

                        </div>

                    </div>

                </div>

                <div className="col-lg-3">

                    <div className="card bg-success text-white">

                        <div className="card-body text-center">

                            <h6>Total Sale</h6>

                            <h4>

                                ₹ {totalSale.toLocaleString("en-IN")}

                            </h4>

                        </div>

                    </div>

                </div>

                <div className="col-lg-3">

                    <div className="card bg-warning">

                        <div className="card-body text-center">

                            <h6>Taxable Amount</h6>

                            <h4>

                                ₹ {totalTaxable.toLocaleString("en-IN")}

                            </h4>

                        </div>

                    </div>

                </div>

                <div className="col-lg-3">

                    <div className="card bg-danger text-white">

                        <div className="card-body text-center">

                            <h6>Total Tax</h6>

                            <h4>

                                ₹ {totalTax.toLocaleString("en-IN")}

                            </h4>

                        </div>

                    </div>

                </div>

            </div>

            <div className="row mb-4">

<div className="col-lg-4">

    <div className="card border-success shadow-sm">

        <div className="card-body text-center">

            <h6 className="text-success">

                Sales Bills

            </h6>

            <h2>

                {salesBills}

            </h2>

        </div>

    </div>

</div>

<div className="col-lg-4">

    <div className="card border-primary shadow-sm">

        <div className="card-body text-center">

            <h6 className="text-primary">

                Purchase Bills

            </h6>

            <h2>

                {purchaseBills}

            </h2>

        </div>

    </div>

</div>

<div className="col-lg-4">

    <div className="card border-danger shadow-sm">

        <div className="card-body text-center">

            <h6 className="text-danger">

                Return Bills

            </h6>

            <h2>

                {returnBills}

            </h2>

        </div>

    </div>

</div>

</div>


<div className="card shadow">

<div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">

    <h5 className="mb-0">

        Invoice Register

    </h5>

    <input

        type="text"

        className="form-control"

        placeholder="Search Bill No, Customer, GST, City..."

        style={{ maxWidth: "350px" }}

        value={search}

        onChange={(e) =>

            setSearch(e.target.value)

        }

    />

</div>


<div className="table-responsive">

    <table className="table table-bordered table-hover align-middle mb-0">

        <thead className="table-dark">

            <tr>

                <th>

                    Bill No

                </th>

                <th>Date
                </th>

                <th>

                    Type

                </th>

                <th>

                    Customer

                </th>

                <th>

                    City

                </th>

                <th> Party Type </th>

                <th className="text-end">

                    Taxable

                </th>

                <th className="text-end">

                    CGST

                </th>

                <th className="text-end">

                    SGST

                </th>

                <th className="text-end">

                    IGST

                </th>

                <th className="text-end">

                    Total

                </th>

                <th>

                    Action

                </th>

            </tr>

        </thead>

        <tbody>

        {
    filtered.length > 0 ? (

        filtered.map((row: any, index: number) => (

            <tr key={index}>

                <td>

                    <b>

                        {row.vcn}

                    </b>

                </td>

                <td>

                    {row.date}

                </td>

                <td>

                    {

                        row.type === "S" ?

                            <span className="badge bg-success">

                                Sales

                            </span>

                        :

                        row.type === "P" ?

                            <span className="badge bg-primary">

                                Purchase

                            </span>

                        :

                        row.type === "R" ?

                            <span className="badge bg-danger">

                                Return

                            </span>

                        :

                            <span className="badge bg-secondary">

                                Unknown

                            </span>

                    }

                </td>

                <td>

                    {row.customer}

                </td>

                <td>

                    {row.city}

                </td>

                <td>
                        {
                        row.gstHeading?.toUpperCase().includes("LOCAL")

                        ?

                        <span className="badge bg-success">

                        Local

                        </span>

                        :

                        <span className="badge bg-warning text-dark">

                        Central

                        </span>

                        }
                </td>

                <td className="text-end">

                    ₹ {Number(row.taxable).toLocaleString("en-IN")}

                </td>

                <td className="text-end">

                    {

                        Number(row.igst) > 0

                            ?

                            "-"

                            :

                            "₹ " +

                            Number(row.cgst).toLocaleString("en-IN")

                    }

                </td>

                <td className="text-end">

                    {

                        Number(row.igst) > 0

                            ?

                            "-"

                            :

                            "₹ " +

                            Number(row.sgst).toLocaleString("en-IN")

                    }

                </td>

                <td className="text-end">

                    {

                        Number(row.igst) > 0

                            ?

                            "₹ " +

                            Number(row.igst).toLocaleString("en-IN")

                            :

                            "-"

                    }

                </td>

                <td className="text-end fw-bold">

                    ₹ {Number(row.total).toLocaleString("en-IN")}

                </td>

                <td>
                <Link
                    href={`/dashboard/sales/invoice/${row.vcn}`}
                    className="btn btn-sm btn-primary"
                >
                    View
                </Link>
                   

                </td>

            </tr>

        ))

    ) : (

        <tr>

            <td

                colSpan={11}

                className="text-center py-5"

            >

                No Invoice Found

            </td>

        </tr>

    )

}                   
</tbody>

</table>

</div>

</div>

</div>

);

}