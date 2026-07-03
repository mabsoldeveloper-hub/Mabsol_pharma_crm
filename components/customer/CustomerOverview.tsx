"use client";

interface Props {
  customer: any;
}

export default function CustomerOverview({
  customer,
}: Props) {

  return (

<div className="card shadow border-0 mt-4">

<div className="card-header bg-light">

<h5 className="mb-0">

Customer Information

</h5>

</div>

<div className="card-body">

<div className="row">

<div className="col-md-4 mb-4">

<label className="text-muted small">

Contact Person

</label>

<h6>

{customer.REF || "-"}

</h6>

</div>

<div className="col-md-4 mb-4">

<label className="text-muted small">

Mobile

</label>

<h6>

{customer.PHONE1 || "-"}

</h6>

</div>

<div className="col-md-4 mb-4">

<label className="text-muted small">

Email

</label>

<h6>

{customer.MAILNAM || "-"}

</h6>

</div>

<div className="col-md-6 mb-4">

<label className="text-muted small">

Address

</label>

<h6>

{customer.PARADD || "-"}

</h6>

</div>

<div className="col-md-3 mb-4">

<label className="text-muted small">

City

</label>

<h6>

{customer.CITY || "-"}

</h6>

</div>

<div className="col-md-3 mb-4">

<label className="text-muted small">

State

</label>

<h6>

{customer.STATE || "-"}

</h6>

</div>

<div className="col-md-3">

<label className="text-muted small">

Country

</label>

<h6>

{customer.COUNTRY || "-"}

</h6>

</div>

<div className="col-md-3">

<label className="text-muted small">

Pincode

</label>

<h6>

{customer.PINCODE || "-"}

</h6>

</div>

<div className="col-md-3">

<label className="text-muted small">

GST Number

</label>

<h6>

{customer.GSTNO || "-"}

</h6>

</div>

<div className="col-md-3">

<label className="text-muted small">

Drug License

</label>

<h6>

{customer.DLNO || "-"}

</h6>

</div>

<div className="col-md-3">

<label className="text-muted small">

Price List

</label>

<h6>

{customer.PRICE || "-"}

</h6>

</div>

<div className="col-md-3">

<label className="text-muted small">

Credit Days

</label>

<h6>

{customer.DUEDAYS || 0}

</h6>

</div>

</div>

</div>

</div>

  );

}