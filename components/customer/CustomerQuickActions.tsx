"use client";

import Link from "next/link";

interface Props{
customer:any;
}

export default function CustomerQuickActions({
customer,
}:Props){

return(

<div className="card shadow border-0">

<div className="card-header">

Quick Actions

</div>

<div className="card-body d-grid gap-2">

<Link
href={`/dashboard/customers/edit/${customer._id}`}
className="btn btn-warning"
>

✏ Edit Customer

</Link>

<Link
href={`/dashboard/customers/ledger/${customer._id}`}
className="btn btn-success"
>

📒 Ledger

</Link>

<Link
href={`/dashboard/customers/statement/${customer._id}`}
className="btn btn-info text-white"
>

📄 Statement

</Link>

<Link
href={`/dashboard/orders/create?customer=${customer._id}`}
className="btn btn-primary"
>

➕ New Order

</Link>

<button
className="btn btn-secondary"
onClick={()=>window.print()}
>

🖨 Print

</button>

</div>

</div>

);

}