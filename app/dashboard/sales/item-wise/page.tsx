"use client";

import { useEffect, useState } from "react";

export default function ItemWiseSalePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/item-wise-sale")
      .then((res) => res.json())
      .then((result) => {
        setRows(result.data || []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">
        Item Wise Sale Report
      </h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">Product Code</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Amount</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="border p-2">{row._id}</td>
              <td className="border p-2">{row.totalQty}</td>
              <td className="border p-2">{row.totalAmount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}