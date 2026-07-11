"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

//import DataTable from "@/components/common/DataTable";

export default function RecentBills() {

    const [bills, setBills] = useState<any[]>([]);

    useEffect(() => {

        loadBills();

    }, []);

    const loadBills = async () => {

        const res =
            await fetch("/api/sales/recent");

        const data =
            await res.json();

        setBills(data);

    };

    return (

        <div className="card shadow mt-4">

            <div className="card-header bg-primary text-white">

                <h5 className="mb-0">

                    Recent Bills

                </h5>

            </div>

            <div className="card-body">

                {/* <DataTable id="recentBills"> */}
                <table className="table table-bordered table-striped">

                    <thead>

                        <tr>

                            <th>Voucher</th>

                            <th>Date</th>

                            <th>Customer</th>

                            <th>City</th>

                            <th>User</th>

                            <th>Amount</th>

                            <th>Action</th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            bills.map((bill: any) => (

                                <tr key={bill._id}>

                                    <td>

                                        {bill.VOUCHER}

                                    </td>

                                    <td>

                                        {bill.DATE}

                                    </td>

                                    <td>

                                        {bill.customer}

                                    </td>

                                    <td>

                                        {bill.city}

                                    </td>

                                    <td>

                                        {bill.MACHINEBY}

                                    </td>

                                    <td>

                                        ₹{" "}

                                        {Number(

                                            bill.FINAL || 0

                                        ).toLocaleString("en-IN")}

                                    </td>

                                    <td>

                                        <Link

                                            href={`/dashboard/sales/bills/${bill.VOUCHER}`}

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

    );

}