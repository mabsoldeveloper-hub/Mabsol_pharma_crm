"use client";

export default function RecentActivity() {
  return (
    <div className="card border-0 shadow-sm">

      <div className="card-body">

        <h5>Recent Activity</h5>

        <ul className="list-group">

          <li className="list-group-item">
            New Employee Added
          </li>

          <li className="list-group-item">
            New Lead Assigned
          </li>

          <li className="list-group-item">
            Invoice Generated
          </li>

          <li className="list-group-item">
            Customer Created
          </li>

        </ul>

      </div>

    </div>
  );
}