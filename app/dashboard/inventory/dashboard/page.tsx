// "use client";

// import { useEffect,useState } from "react";

// import InventoryCards from "@/components/inventory/InventoryCards";

// export default function InventoryDashboard(){

// const [summary,setSummary]=useState<any>(null);

// useEffect(()=>{

// loadDashboard();

// },[]);

// const loadDashboard=async()=>{

// const res=await fetch("/api/inventory/dashboard");

// const data=await res.json();

// setSummary(data);

// }

// if(!summary){

// return <h4 className="text-center mt-5">Loading...</h4>

// }

// return(

// <div className="container-fluid">

// <h2 className="mb-4">

// Inventory Dashboard

// </h2>

// <InventoryCards summary={summary}/>

// </div>

// )

// }
"use client";

import { useEffect, useMemo, useState } from "react";

import InventoryCards from "@/components/inventory/InventoryCards";
import LowStockTable from "@/components/inventory/LowStockTable";
import NegativeStockTable from "@/components/inventory/NegativeStockTable";
import TopProductsTable from "@/components/inventory/TopProductsTable";
import CompanySummary from "@/components/inventory/CompanySummary";

export default function InventoryDashboard() {

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    loadProducts();

  }, []);

  const loadProducts = async () => {

    setLoading(true);

    try {

      const res = await fetch("/api/products");

      const data = await res.json();

      setProducts(data);

    } catch (e) {

      console.log(e);

    }

    setLoading(false);

  };

  const summary = useMemo(() => {

    const totalProducts = products.length;

    const activeProducts =
      products.filter(
        (p: any) => p.STATUS === "Y"
      ).length;

    const inactiveProducts =
      products.filter(
        (p: any) => p.STATUS !== "Y"
      ).length;

    const totalCompanies =
      new Set(
        products
          .map(
            (p: any) =>
              p.companyName || p.GCODE
          )
          .filter(Boolean)
      ).size;

    const availableProducts =
      products.filter(
        (p: any) =>
          Number(p.BALANCE) > 0
      ).length;

    const lowStock =
      products.filter(
        (p: any) =>
          Number(p.BALANCE) > 0 &&
          Number(p.BALANCE) <= 10
      ).length;

    const outOfStock =
      products.filter(
        (p: any) =>
          Number(p.BALANCE) <= 0
      ).length;

    const negativeStock =
      products.filter(
        (p: any) =>
          Number(p.BALANCE) < 0
      ).length;

    const totalStock =
      products.reduce(
        (sum: number, p: any) =>
          sum + Number(p.BALANCE || 0),
        0
      );

    const stockValue =
      products.reduce(
        (sum: number, p: any) =>
          sum +
          Number(p.BALANCE || 0) *
            Number(p.PRATE || 0),
        0
      );

    return {

      totalProducts,

      activeProducts,

      inactiveProducts,

      totalCompanies,

      availableProducts,

      lowStock,

      outOfStock,

      negativeStock,

      totalStock,

      stockValue,

    };

  }, [products]);

  const lowStockProducts =
    products.filter(
      (p: any) =>
        Number(p.BALANCE) > 0 &&
        Number(p.BALANCE) <= 10
    );

  const negativeProducts =
    products.filter(
      (p: any) =>
        Number(p.BALANCE) < 0
    );

  const topProducts =
    [...products]
      .sort(
        (a: any, b: any) =>
          Number(b.BALANCE) -
          Number(a.BALANCE)
      )
      .slice(0, 10);

  if (loading) {

    return (

      <div className="text-center mt-5">

        Loading...

      </div>

    );

  }

  return (

    <div className="container-fluid">

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>

          <h2 className="mb-0">

            Inventory Dashboard

          </h2>

          <small className="text-muted">

            Live Inventory Analytics

          </small>

        </div>

      </div>

      <InventoryCards
        summary={summary}
      />

      <div className="row mt-4">

        <div className="col-lg-6">

          <LowStockTable
            products={lowStockProducts}
          />

        </div>

        <div className="col-lg-6">

          <NegativeStockTable
            products={negativeProducts}
          />

        </div>

      </div>

      <div className="row mt-4">

        <div className="col-lg-12">

          <TopProductsTable
            products={topProducts}
          />

        </div>

      </div>

        <div className="row mt-4">
            <div className="col-lg-12">
                <CompanySummary
                    products={products}
                />
            </div>
        </div>

    </div>

  );

}