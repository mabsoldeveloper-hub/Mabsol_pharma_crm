"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <button 
      className="btn" 
      onClick={handleRefresh} 
      type="button"
      style={{ 
        display: "inline-flex", 
        alignItems: "center", 
        gap: "6px",
        padding: "6px 12px",
        fontSize: "12px",
        borderRadius: "6px",
        cursor: "pointer"
      }}
    >
      <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
      Refresh logs
    </button>
  );
}
