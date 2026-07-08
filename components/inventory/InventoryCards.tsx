"use client";

import {
FaBoxes,
FaWarehouse,
FaExclamationTriangle,
FaTimesCircle,
FaRupeeSign
} from "react-icons/fa";

export default function InventoryCards({ summary }: any) {

const cards=[

{
title:"Products",
value:summary.totalProducts,
color:"primary",
icon:<FaBoxes size={28}/>
},

{
title:"Available",
value:summary.availableProducts,
color:"success",
icon:<FaWarehouse size={28}/>
},

{
title:"Low Stock",
value:summary.lowStock,
color:"warning",
icon:<FaExclamationTriangle size={28}/>
},

{
title:"Negative",
value:summary.negativeStock,
color:"danger",
icon:<FaTimesCircle size={28}/>
},

{
title:"Stock Value",
value:"₹"+Number(summary.stockValue).toLocaleString(),
color:"info",
icon:<FaRupeeSign size={28}/>
}

];

return(

<div className="row g-3">

{cards.map((card,index)=>(

<div className="col-lg col-md-6" key={index}>

<div className={`card shadow bg-${card.color} text-white border-0`}>

<div className="card-body">

<div className="d-flex justify-content-between">

<div>

<h6>{card.title}</h6>

<h3>{card.value}</h3>

</div>

{card.icon}

</div>

</div>

</div>

</div>

))}

</div>

);

}