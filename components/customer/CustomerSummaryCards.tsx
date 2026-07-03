"use client";

interface Props {
  customer: any;
}

export default function CustomerSummaryCards({
  customer,
}: Props) {

  const cards = [
    {
      title: "Outstanding",
      value: customer.BALANCE || 0,
      color: "danger",
    },
    {
      title: "Credit",
      value: customer.CREDIT || 0,
      color: "success",
    },
    {
      title: "Debit",
      value: customer.DEBIT || 0,
      color: "primary",
    },
    {
      title: "Opening",
      value: customer.OPNING || 0,
      color: "warning",
    },
  ];

  return (

<div className="row mb-4">

{

cards.map((card,index)=>(

<div
className="col-lg-3 col-md-6 mb-3"
key={index}
>

<div className="card shadow border-0 h-100">

<div className="card-body">

<div className="text-muted small">

{card.title}

</div>

<h3 className={`mt-2 text-${card.color}`}>

₹{Number(card.value).toLocaleString()}

</h3>

</div>

</div>

</div>

))

}

</div>

  );

}