"use client";

import { useEffect, useState } from "react";

export default function SalesViewPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const res = await fetch("/api/sales");
      const result = await res.json();

      if (result.success) {
        setSales(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2>Loading sales data...</h2>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="p-6">
        <h2>No Records Found</h2>
      </div>
    );
  }

  // First record se columns generate karenge
  const columns = Object.keys(sales[0]).filter(
    (key) => key !== "__v"
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Sales Type List ({sales.length})
        </h1>

        <button
          onClick={loadSales}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column) => (
                <th
                  key={column}
                  className="border px-3 py-2 text-left"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sales.map((row, index) => (
              <tr key={row._id || index}>
                {columns.map((column) => (
                  <td
                    key={column}
                    className="border px-3 py-2"
                  >
                    {row[column] !== null &&
                    row[column] !== undefined
                      ? String(row[column])
                      : "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}