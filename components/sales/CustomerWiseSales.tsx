"use client";

import { useEffect, useState } from "react";
//import DataTable from "@/components/common/DataTable";

export default function CustomerWiseSales() {

    const [customers, setCustomers] = useState<any[]>([]);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {

        try {

            const res = await fetch("/api/sales/customer-wise");

            const data = await res.json();

            console.log("API Response :", data);
            console.log("Is Array :", Array.isArray(data));

            if (Array.isArray(data)) {
                setCustomers(data);
            } else {
                console.error("Invalid API Response", data);
                setCustomers([]);
            }

        } catch (err) {

            console.error(err);
            setCustomers([]);

        }

    };

    return (

        <div className="card shadow mt-4">

            <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Customer Wise Sales</h5>
            </div>

            <div className="card-body">

                {/* <DataTable id="customerWiseSales"> */}
                {/* <DataTable id="customerWiseSales"> */}
                <table className="table table-bordered table-striped">

                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>City</th>
                            <th>Total Bills</th>
                            <th>Total Sale</th>
                            <th>Average Bill</th>
                            <th>Last Bill</th>
                        </tr>
                    </thead>

                    <tbody>

                        {customers.length > 0 ? (

                            customers.map((c: any, index: number) => (

                                <tr key={index}>

                                    <td>{c.customer}</td>

                                    <td>{c.city}</td>

                                    <td>{Number(c.bills).toLocaleString()}</td>

                                    <td>
                                        ₹ {Number(c.amount).toLocaleString("en-IN")}
                                    </td>

                                    <td>
                                        ₹ {(c.bills
                                            ? c.amount / c.bills
                                            : 0
                                        ).toLocaleString("en-IN", {
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>

                                    <td>{c.lastBill}</td>

                                </tr>

                            ))

                        ) : (

                            <tr>

                                <td colSpan={6} className="text-center">

                                    No Data Found

                                </td>

                            </tr>

                        )}

                    </tbody>

                </table>

            </div>

        </div>

    );

}