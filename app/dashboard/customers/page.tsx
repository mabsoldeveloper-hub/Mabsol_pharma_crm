"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface Customer {
  _id?: string;
  CODEP?: string;
  PARNAM?: string;
  MAILNAM?: string;
  PHONE1?: string;
  CITY?: string;
  GSTNO?: string;
  DLNO?: string;
  BALANCE?: number;
  CREDIT?: number;
  STATUS?: string;
  REF?: string;

  GROUPNAME?: string;
  SCODE?: string;
}

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive" | "Outstanding">("All");
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState("All");

  useEffect(() => {
    loadCustomers();
  }, []);

  const groups = useMemo(() => {
    const arr = customers
        .map(c => c.GROUPNAME)
        .filter(Boolean);
    return ["All", ...new Set(arr)];
  }, [customers]);


  

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Customers (Optimized with useMemo)
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const searchTerm = search.toLowerCase();

      const matchSearch =
        (c.PARNAM?.toLowerCase() || "").includes(searchTerm) ||
        (c.CODEP?.toLowerCase() || "").includes(searchTerm) ||
        (c.GSTNO?.toLowerCase() || "").includes(searchTerm) ||
        (c.PHONE1?.toLowerCase() || "").includes(searchTerm);

      let matchStatus = true;

      if (statusFilter === "Active") {
        matchStatus = c.STATUS === "Y";
      } else if (statusFilter === "Inactive") {
        matchStatus = c.STATUS !== "Y";
      } else if (statusFilter === "Outstanding") {
        matchStatus = Number(c.BALANCE) > 0;
      }

      const matchGroup =
        groupFilter === "All" ||
        c.GROUPNAME === groupFilter;
      return matchSearch && matchStatus && matchGroup;
    });
  }, [customers, search, statusFilter, groupFilter]);

  // Dashboard Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.STATUS === "Y").length;
  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.BALANCE) || 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + (Number(c.CREDIT) || 0), 0);
  

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Customer Master</h2>
          <p className="text-muted mb-0">Manage all customers from one place</p>
        </div>
        <button className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>
          Add Customer
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="row mb-4 g-3">
        <div className="col-lg-3 col-md-6">
          <div className="card shadow border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted">Total Customers</h6>
              <h2 className="mb-0">{totalCustomers}</h2>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="card shadow border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted">Active Customers</h6>
              <h2 className="mb-0 text-success">{activeCustomers}</h2>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="card shadow border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted">Outstanding</h6>
              <h4 className="mb-0 text-danger">
                ₹{totalOutstanding.toLocaleString()}
              </h4>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="card shadow border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted">Total Credit</h6>
              <h4 className="mb-0 text-success">
                ₹{totalCredit.toLocaleString()}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card shadow border-0 mb-4">
        <div className="card-body">
          <div className="row align-items-center g-3">
            <div className="col-lg-3">
              <input
                type="text"
                placeholder="Search by Name, Code, GST or Phone..."
                className="form-control form-control-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-lg-3">
                <select
                    className="form-select form-select-lg"
                    value={groupFilter}
                    onChange={(e)=>setGroupFilter(e.target.value)}
                >

                  {
                    groups.map(g=>(
                    <option key={g} value={g}>
                    {g}
                    </option>
                    ))
                  }

                </select>
            </div>

            <div className="col-lg-3">
              <select
                className="form-select form-select-lg"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Outstanding">Outstanding</option>
              </select>
            </div>

            <div className="col-lg-3 text-end">
              <button className="btn btn-success me-2">
                <i className="bi bi-file-earmark-excel"></i> Excel
              </button>
              <button className="btn btn-danger me-2">
                <i className="bi bi-file-earmark-pdf"></i> PDF
              </button>
              <button className="btn btn-secondary">
                <i className="bi bi-printer"></i> Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card shadow border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Customer Name</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th>GST No</th>
                  <th>DL No</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5">
                      Loading customers...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5 text-muted">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c, index) => (
                    <tr key={c._id || index}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="fw-bold text-primary">{c.CODEP}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div>
                            <div className="fw-bold">{c.PARNAM}</div>
                            <small className="text-muted">
                              {c.MAILNAM || "No Email"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{c.PHONE1 || c.REF || "-"}</td>
                      <td>{c.CITY || "-"}</td>
                      <td>{c.GSTNO || "-"}</td>
                      <td>{c.DLNO || "-"}</td>
                      <td>
                        <span
                          className={
                            Number(c.BALANCE) > 0
                              ? "text-danger fw-bold"
                              : "text-success fw-bold"
                          }
                        >
                          ₹{Number(c.BALANCE || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        {c.STATUS === "Y" ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-2 justify-content-center">

                          <Link href={`/dashboard/customers/view/${c._id}`} className="btn btn-primary btn-sm" > View </Link>
                          <Link href={`/dashboard/customers/ledger/${c._id}`} className="btn btn-sm btn-success"> Ledger</Link>
                          
                          <button className="btn btn-sm btn-warning">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination / Footer */}
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <div>
              Showing <b>{filteredCustomers.length}</b> of{" "}
              <b>{totalCustomers}</b> customers
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-light">Previous</button>
              <button className="btn btn-primary">1</button>
              <button className="btn btn-light">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}