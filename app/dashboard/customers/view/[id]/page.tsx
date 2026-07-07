"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerSummaryCards from "@/components/customer/CustomerSummaryCards";
import CustomerQuickActions from "@/components/customer/CustomerQuickActions";
import CustomerOverview from "@/components/customer/CustomerOverview";



export default function CustomerViewPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/customers/${id}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch customer`);
      }

      const data = await res.json();
      
      if (!data || Object.keys(data).length === 0) {
        setError("Customer not found");
      } else {
        setCustomer(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center mt-5 text-danger">
        Error: {error}
        <br />
        <button onClick={loadCustomer} className="btn btn-primary mt-3">
          Retry
        </button>
      </div>
    );
  }

  

  if (!customer) {
    return (
      <div className="text-center mt-5">
        Loading...
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-lg-9">
          <CustomerHeader customer={customer}/>
        </div>
        <div className="col-lg-3">
          <CustomerQuickActions customer={customer}/>
        </div>
      </div>
      
      <CustomerSummaryCards customer={customer}/>
      <CustomerOverview customer={customer} />
    </div>
  )
}