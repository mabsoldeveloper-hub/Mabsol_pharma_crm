// "use client";

// import { useEffect, useRef } from "react";

// import $ from "jquery";

// import "datatables.net-bs5";
// import "datatables.net-responsive-bs5";

// import "datatables.net-buttons-bs5";
// import "datatables.net-buttons/js/buttons.html5";
// import "datatables.net-buttons/js/buttons.print";


// export default function DataTable({

//     children,

//     id,

// }: any) {

//     const tableRef = useRef<any>(null);

//     useEffect(() => {

//         if (!tableRef.current) return;

//         if ($.fn.DataTable.isDataTable(tableRef.current)) {

//             $(tableRef.current).DataTable().destroy();

//         }

//         const timer = setTimeout(() => {

//             $(tableRef.current).DataTable({

//                 responsive: true,

//                 pageLength: 10,

//                 lengthMenu: [

//                     [10, 25, 50, 100, -1],

//                     [10, 25, 50, 100, "All"]

//                 ],

//                 ordering: true,

//                 searching: true,

//                 autoWidth: false,

//                 destroy: true,

//                 dom: "Bfrtip",

//                 buttons: [

//                     "copy",

//                     "csv",

//                     "excel",

//                     "print"

//                 ],

//             });

//         }, 100);

//         return () => {

//             clearTimeout(timer);

//             if ($.fn.DataTable.isDataTable(tableRef.current)) {

//                 $(tableRef.current).DataTable().destroy();

//             }

//         };

//     }, [children]);

//     return (

//         <table

//             id={id}

//             ref={tableRef}

//             className="table table-bordered table-hover table-striped"

//             style={{ width: "100%" }}

//         >

//             {children}

//         </table>

//     );

// }