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

import { useEffect,useState } from "react";

import InventoryCards from "@/components/inventory/InventoryCards";
// import InventoryCharts from "@/components/inventory/InventoryCharts";
 import LowStockTable from "@/components/inventory/LowStockTable";
 import NegativeStockTable from "@/components/inventory/NegativeStockTable";
 import TopProductsTable from "@/components/inventory/TopProductsTable";

export default function InventoryDashboard(){

const [summary,setSummary]=useState<any>(null);

useEffect(()=>{loadDashboard(); },[]);

    const loadDashboard=async()=>{
        const res=await fetch("/api/inventory/dashboard");
        const data=await res.json();
        setSummary(data);
    }

    

if(!summary){

return <h4>Loading...</h4>

}

return(

<div className="container-fluid">

<h2 className="mb-4">

Inventory Dashboard

</h2>

<InventoryCards summary={summary}/>

<div className="row mt-4">

{/* <div className="col-lg-8">

<InventoryCharts summary={summary}/>

</div> */}

<div className="col-lg-4">

<LowStockTable products={summary.lowStockProducts}/>

</div>

</div>

<div className="row mt-4">

<div className="col-lg-6">

<NegativeStockTable products={summary.negativeProducts}/>

</div>

<div className="col-lg-6">

<TopProductsTable products={summary.topProducts}/>

</div>

</div> 

</div>

)

}