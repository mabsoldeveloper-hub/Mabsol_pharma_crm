"use client";

import { useEffect, useState } from "react";

//import DataTable from "@/components/common/DataTable";

export default function TopProducts() {

    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {

        loadProducts();

    }, []);

    const loadProducts = async () => {

        const res =
            await fetch("/api/sales/top-products");

        const data =
            await res.json();

        setProducts(data);

    };

    return (

        <div className="card shadow">

            <div className="card-header bg-success text-white">

                <h5 className="mb-0">

                    Top Selling Products

                </h5>

            </div>

            <div className="card-body">

                {/* <DataTable id="topProducts"> */}
                <table className="table table-bordered table-striped">

                    <thead>

                        <tr>

                            <th>Product</th>

                            <th>Company</th>

                            <th>Qty</th>

                            <th>Amount</th>

                            <th>MRP</th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            products.map((p: any) => (

                                <tr key={p.code}>

                                    <td>

                                        {p.product}

                                    </td>

                                    <td>

                                        {p.company}

                                    </td>

                                    <td>

                                        {Number(p.qty).toLocaleString()}

                                    </td>

                                    <td>

                                        ₹{" "}

                                        {Number(

                                            p.amount

                                        ).toLocaleString("en-IN")}

                                    </td>

                                    <td>

                                        ₹{" "}

                                        {Number(

                                            p.mrp

                                        ).toLocaleString("en-IN")}

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