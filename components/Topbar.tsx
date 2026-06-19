"use client";

//import { useState } from "react";
import {
  Bell,
  Moon,
  Sun,
  PersonCircle,
} from "react-bootstrap-icons";
import { useEffect, useState } from "react";

import LogoutButton from "./LogoutButton";

export default function Topbar({
  collapsed,
  setCollapsed,
  mobile,
}: {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobile: boolean;
}) {

  const [darkMode, setDarkMode] =
    useState(
      () =>
        typeof window !== "undefined" &&
        localStorage.getItem("theme") === "dark"
    );

    useEffect(() => {
        if (darkMode) {
          document.body.classList.add("dark-mode");
          localStorage.setItem("theme", "dark");
        } else {
          document.body.classList.remove("dark-mode");
          localStorage.setItem("theme", "light");
        }
      }, [darkMode]);


      const loadCurrentFY = async () => {

        const res = await fetch(
          "/api/financial-year"
        );
      
        const data = await res.json();
      
        const currentFY =
          data.find(
            (x:any) => x.isCurrent
          );
      
        if (currentFY) {
      
          setSelectedFY(currentFY);
      
          setSelectedCompany(
            currentFY.companyId
          );
      
        } else {
      
          setSelectedFY(null);
          setSelectedCompany(null);
      
        }
      
      };

      useEffect(() => {

        loadCurrentFY();
      
      }, []);
//       const [company, setCompany] = useState<any>(null);

// useEffect(() => {
//   fetch("/api/company-master")
//     .then((res) => res.json())
//     .then((data) => setCompany(data));
// }, []);
// useEffect(() => {

//   loadCompanies();

// }, []);

// const loadCompanies = async () => {

//   const res =
//     await fetch(
//       "/api/company-master"
//     );

//   const data =
//     await res.json();

//   setCompanies(data);

//   const savedCompany =
//     localStorage.getItem(
//       "currentCompany"
//     );

//   if (
//     savedCompany &&
//     data.length > 0
//   ) {

//     const company =
//       data.find(
//         (x) =>
//           x._id ===
//           savedCompany
//       );

//     if (company) {

//       setSelectedCompany(
//         company
//       );

//       changeCompany(
//         company._id
//       );

//       return;
//     }
//   }

//   if (data.length > 0) {

//     setSelectedCompany(
//       data[0]
//     );

//     changeCompany(
//       data[0]._id
//     );
//   }
// };


// const changeCompany = async (companyId) => {

//   const company =
//     companies.find(
//       x => x._id === companyId
//     );

//   setSelectedCompany(company);

//   localStorage.setItem(
//     "currentCompany",
//     companyId
//   );

//   const res = await fetch(
//     `/api/financial-year?companyId=${companyId}`
//   );

//   const fyList =
//     await res.json();

//   setFinancialYears(fyList);

//   if (fyList.length > 0) {

//     const currentFY =
//       fyList.find(
//         (x) => x.isCurrent
//       );

//     if (currentFY) {

//       setSelectedFY(
//         currentFY._id
//       );

//       localStorage.setItem(
//         "currentFY",
//         currentFY._id
//       );

//     } else {

//       setSelectedFY(
//         fyList[0]._id
//       );

//     }

//   } else {

//     setSelectedFY("");

//     localStorage.removeItem(
//       "currentFY"
//     );
//   }

// };


useEffect(() => {

  fetch("/api/financial-year")
    .then(res => res.json())
    .then(data => {

      const currentFY =
        data.find(
          (x:any) => x.isCurrent
        );

      if (currentFY) {

        setSelectedFY(currentFY);

        setSelectedCompany(
          currentFY.companyId
        );
      }

    });

}, []);
// useEffect(() => {

//   fetch("/api/financial-year")
//     .then(res => res.json())
//     .then(data => {

//       const currentFY =
//         data.find(
//           (x:any) => x.isCurrent
//         );

//       if (currentFY) {

//         setSelectedFY(currentFY);

//         setSelectedCompany(
//           currentFY.companyId
//         );
//       }
//     });

// }, []);



// useEffect(() => {

//   fetch("/api/financial-year")
//     .then((res) => res.json())
//     .then((data) => {

//       setFinancialYears(data);

//       const current =
//         data.find(
//           (x:any) =>
//             x.isCurrent
//         );

//       if (current)
//         setSelectedFY(
//           current._id
//         );
//     });

// }, []);




  return (
    <div
      className="bg-white border-bottom px-3 py-3 d-flex justify-content-between align-items-center shadow-sm"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
      }}
    >
      {/* LEFT */}

      <div className="d-flex align-items-center gap-3">

        <button
          className="btn btn-dark"
          onClick={() =>
            setCollapsed(!collapsed)
          }
        >
          ☰
        </button>

        {!mobile && (
          <h5
            className="mb-0 fw-bold"
            style={{
              color: "#0f172a",
            }}
          >
           {/* // {selectedCompany?.companyName || "Select Company"} */}
           <div className="d-flex align-items-center gap-3">

              <span
                className="badge bg-primary fs-6"
              >
                {selectedCompany?.companyName}
              </span>

              <span
                className="badge bg-success fs-6"
              >
                {selectedFY?.fyName}
              </span>

            </div>


          </h5>



        )}


{/* <select
 value={selectedFY}
 onChange={(e)=>{

  setSelectedFY(
    e.target.value
  );

  localStorage.setItem(
    "currentFY",
    e.target.value
  );

 }}
>

{
 financialYears.length > 0
 ?
 financialYears.map(
  (fy)=>(
   <option
    key={fy._id}
    value={fy._id}
   >
    {fy.fyName}
   </option>
  )
 )
 :
 <option>
  No FY Found
 </option>
}

</select> */}
      </div>



      {/* RIGHT */}

      <div className="d-flex align-items-center gap-3">

        {/* DARK MODE */}

        <button
          className="btn btn-light border"
          onClick={() => {

            const newMode = !darkMode;
          
            setDarkMode(newMode);
          }}
        >
          {darkMode ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>

        {/* NOTIFICATION */}

        <div className="dropdown">

          <button
            className="btn btn-light border position-relative"
            data-bs-toggle="dropdown"
          >
            <Bell size={20} />

            <span
              className="badge bg-danger position-absolute"
              style={{
                top: "-5px",
                right: "-5px",
              }}
            >
              5
            </span>
          </button>

          <ul className="dropdown-menu dropdown-menu-end shadow">

            <li>
              <a
                className="dropdown-item"
                href="#"
              >
                New Lead Assigned
              </a>
            </li>

            <li>
              <a
                className="dropdown-item"
                href="#"
              >
                New Customer Added
              </a>
            </li>

            <li>
              <a
                className="dropdown-item"
                href="#"
              >
                Payment Received
              </a>
            </li>

          </ul>

        </div>

        {/* PROFILE */}

        <div className="dropdown">

          <button
            className="btn btn-light border d-flex align-items-center gap-2"
            data-bs-toggle="dropdown"
          >
            <PersonCircle size={24} />

            {!mobile && (
              <span>
                Company Admin
              </span>
            )}
          </button>

          <ul className="dropdown-menu dropdown-menu-end shadow">

            <li>
            <a
              className="dropdown-item"
              href="/dashboard/profile"
            >
              My Profile
            </a>
            </li>

            <li>
              <a
                className="dropdown-item"
                href="/dashboard/settings"
              >
                Settings
              </a>  
            </li>

            <li>
              <hr className="dropdown-divider" />
            </li>

            <li className="px-3">
              <LogoutButton />
            </li>

          </ul>

        </div>

      </div>
    </div>
  );
}
