"use client";

import { useEffect, useState } from "react";

import SalesCards from "@/components/sales/SalesCards";
import RecentBills from "@/components/sales/RecentBills";
import TopProducts from "@/components/sales/TopProducts";
import CustomerWiseSales from "@/components/sales/CustomerWiseSales";

export default function SalesDashboard() {

  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {

    loadDashboard();

  }, []);

  const loadDashboard = async () => {

    const res = await fetch("/api/sales/dashboard");

    const data = await res.json();

    setSummary(data);

  };

  if (!summary) {

    return <div className="text-center mt-5">Loading...</div>;

  }

  return (

    <div className="container-fluid">

      <SalesCards summary={summary} />

        <div className="row mt-4">
            <div className="col-lg-12">
                <TopProducts />
            </div>
        </div>

        <div className="row mt-4">
            <div className="col-lg-12">
                <CustomerWiseSales />
            </div>
        </div>

        <div className="mt-4">
            <RecentBills />
        </div>

    </div>

  );

}