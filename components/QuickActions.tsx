"use client";

import Link from "next/link";

export default function QuickActions() {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">

        <h5>Quick Actions</h5>

        <div className="d-grid gap-2">

          <Link
            href="/users/create"
            className="btn btn-primary"
          >
            Add User
          </Link>

          <Link
            href="/customers/create"
            className="btn btn-success"
          >
            Add Customer
          </Link>

          <Link
            href="/leads/create"
            className="btn btn-warning"
          >
            Add Lead
          </Link>

        </div>

      </div>
    </div>
  );
}