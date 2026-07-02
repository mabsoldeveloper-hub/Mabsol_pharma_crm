"use client";

//import { useState } from "react";
import {Bell, Moon, Sun, PersonCircle,} from "react-bootstrap-icons";
import { useState, useEffect } from "react";

import LogoutButton from "./LogoutButton";
import { useUser } from "@/context/UserContext";

export default function Topbar({
  collapsed,
  setCollapsed,
  mobile,
}: any) {

  //const [selectedCompany, setSelectedCompany] = useState<any>(null);

  const [selectedFY, setSelectedFY] = useState<any>(null);
  const {user,} = useUser();

  const [darkMode, setDarkMode] = useState(false);
  

  useEffect(() => {
     const theme = localStorage.getItem("theme");
      
        if (theme === "dark") {
          document.body.classList.add("dark-mode");
          setDarkMode(true);
        }
      }, []);


     

      // useEffect(() => {

      //   loadCurrentFY();
      
      // }, []);


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

        // setSelectedCompany(
        //   currentFY.companyId
        // );
      }

    });

}, []);




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
                {user?.companyId?.companyName}
              </span>

              <span
                className="badge bg-success fs-6"
              >
                {selectedFY?.fyName}
              </span>

            </div>


          </h5>



        )}


      </div>



      {/* RIGHT */}

      <div className="d-flex align-items-center gap-3">

        {/* DARK MODE */}

        <button
          className="btn btn-light border"
          onClick={() => {

            const newMode = !darkMode;
          
            setDarkMode(newMode);
          
            if (newMode) {
              document.body.classList.add(
                "dark-mode"
              );
          
              localStorage.setItem(
                "theme",
                "dark"
              );
          
            } else {
          
              document.body.classList.remove(
                "dark-mode"
              );
          
              localStorage.setItem(
                "theme",
                "light"
              );
            }
          
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
             <div className="d-flex flex-column text-start">

             <span>
               {user?.name}
             </span>
           
             <small className="text-muted">
               {user?.roleId?.roleName}
             </small>
           
           </div>
             
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