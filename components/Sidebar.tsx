"use client";
import PermissionGate from "@/components/PermissionGate";
import { usePermission } from "@/context/PermissionContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";



import {
  FaTachometerAlt,
  FaUsers,
  FaCog,
  FaBoxOpen,
  FaShoppingCart,
  FaChartBar,
  FaChevronDown,
  FaChevronRight,
  FaBuilding,
  FaCalendarAlt,
  FaDatabase,
  FaExchangeAlt,
} from "react-icons/fa";

type SidebarProps = {
  collapsed: boolean;
  setCollapsed?: (value: boolean) => void;
  mobile: boolean;
};

type CompanyBrand = {
  logo?: string;
};

export default function Sidebar({
  collapsed,
  mobile,
}: SidebarProps) {

  const { can } = usePermission();
  const [crmOpen, setCrmOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const pathname = usePathname();

  const [customerOpen, setCustomerOpen] = useState(false);
  // Comapny Master 
  const [companyOpen, setCompanyOpen] = useState(false);
  // financial yea master
  const [fyOpen, setFyOpen] = useState(false);
  // VFP dropdown toggle
  const [vfpOpen, setVfpOpen] = useState(false);


  const [company, setCompany] = useState<any>(null);
  useEffect(() => {
    fetch("/api/company-master")
      .then((res) => res.json())
      .then((data) => setCompany(data));
  }, []);



  return (
    <div
      className="text-white d-flex flex-column"
      style={{
        backgroundColor: "#343872",
        width: mobile
          ? collapsed
            ? "0px"
            : "260px"
          : collapsed
            ? "80px"
            : "260px",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "all .3s ease",
        zIndex: 1050,
      }}
    >
      <div className="p-3 d-flex flex-column" style={{ height: "100%", }} >
        <div className="text-center flex justify-center">
          {collapsed ? (<img src={company?.logo || "/logo.png"} alt="logo" width="40" height="40" className="rounded-circle" />) : (
            <>
              <img
                src={company?.logo || "/logo.png"}
                alt="logo"
                width="150"
                className=""
              />
            </>
          )}
        </div>
        <hr />

        <div className="sidebar-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: "90px",
          }}
        >

          <ul className="nav flex-column">

            {/* Dashboard Start Here */}
            <PermissionGate permission="dashboard.view">

              <li className="nav-item mb-2">
                <Link href="/dashboard" title={collapsed ? "Dashboard" : ""}
                  className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname === "/dashboard"
                    ? "bg-primary text-white"
                    : "text-white"
                    }`}
                >
                  <FaTachometerAlt />

                  {!collapsed && (
                    <span className="ms-3"> Dashboard </span>
                  )}

                </Link>
              </li>

            </PermissionGate>
            {/* Dashboard END Here */}
            {/* ############################################### */}
            {/* users section Start Here */}
            <PermissionGate permission="users.view">

              <li className="nav-item">
                <button
                  title={collapsed ? "Users" : ""}
                  className="btn text-white w-100 d-flex align-items-center justify-content-between"
                  onClick={() => setCrmOpen(!crmOpen)}
                >
                  <span className="d-flex align-items-center">
                    <FaUsers size={16} />

                    {!collapsed && (
                      <span className="ms-3">
                        Users
                      </span>
                    )}
                  </span>

                  {!collapsed &&
                    (crmOpen ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    ))}
                </button>

                {crmOpen && !collapsed && (
                  <ul className="nav flex-column ms-4">
                    <li>
                      <Link href="/dashboard/users" className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("/dashboard/users")
                        ? "bg-primary text-white"
                        : "text-white"
                        }`}
                      >
                        User management
                      </Link>
                    </li>

                    <li>
                      <Link href="/dashboard/permissions" className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("/dashboard/permissions")
                        ? "bg-primary text-white"
                        : "text-white"
                        }`}
                      >
                        Permission
                      </Link>
                    </li>

                    <li>
                      <Link href="/dashboard/roles" className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("/dashboard/roles")
                        ? "bg-primary text-white"
                        : "text-white"
                        }`}
                      >
                        Roles
                      </Link>
                    </li>
                  </ul>
                )}

              </li>

            </PermissionGate>
            {/* users section end */}
            {/* ######################################################### */}
            {/* Inventory Section start here  */}
            <PermissionGate permission="inventory.view">

              <li className="nav-item mt-2">
                <button title={collapsed ? "Inventory" : ""} className="btn text-white w-100 d-flex align-items-center justify-content-between"
                  onClick={() =>
                    setInventoryOpen(!inventoryOpen)
                  }
                >
                  <span className="d-flex align-items-center">
                    <FaBoxOpen size={16} />

                    {!collapsed && (
                      <span className="ms-3"> Inventory </span>
                    )}
                  </span>

                  {!collapsed &&
                    (inventoryOpen ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    ))}
                </button>

                {inventoryOpen && !collapsed && (
                  <ul className="nav flex-column ms-4">

                    <li>
                      <Link href="/dashboard/inventory/dashboard" className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname === "/dashboard/inventory/dashboard"
                        ? "bg-primary text-white"
                        : "text-white"
                        }`}
                      >
                        Inventory Dashboard
                      </Link>
                    </li>

                    <li>
                      <Link href="/dashboard/inventory/products" className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("/dashboard/inventory/products")
                        ? "bg-primary text-white"
                        : "text-white"
                        }`}
                      >
                        Products
                      </Link>
                    </li>

                    <li>
                      <Link href="#" className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("#")
                        ? "bg-primary text-white"
                        : "text-white"
                        }`}
                      >
                        Stock
                      </Link>
                    </li>
                  </ul>
                )}
              </li>

            </PermissionGate>
            {/* Inventory Section END here  */}
            {/* ######################################## */}
            {/* Sales Section Start here */}
            <PermissionGate permission="sales.view">
              <li className="nav-item mt-2">

                <button
                  title={collapsed ? "Sales" : ""}
                  className="btn text-white w-100 d-flex align-items-center justify-content-between"
                  onClick={() => setSalesOpen(!salesOpen)}
                >
                  <span className="d-flex align-items-center">
                    <FaShoppingCart size={16} />

                    {!collapsed && (
                      <span className="ms-3">
                        Sales
                      </span>
                    )}
                  </span>

                  {!collapsed &&
                    (salesOpen ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    ))}
                </button>

                {salesOpen && !collapsed && (
                  <ul className="nav flex-column ms-4">
                    <li>
                      <Link href="/dashboard/sales/dashboard/" className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("/dashboard/sales/dashboard/")
                        ? "bg-primary text-white"
                        : "text-white"
                        }`}
                      >
                        Sales Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/sales/invoices"
                        className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("/dashboard/sales/invoices")
                          ? "bg-primary text-white"
                          : "text-white"
                          }`}
                      >
                        Invoices
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="#"
                        className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("#")
                          ? "bg-primary text-white"
                          : "text-white"
                          }`}
                      >
                        Orders
                      </Link>
                    </li>
                  </ul>
                )}
              </li>

            </PermissionGate>
            {/* Sales Section END here */}
            {/* ################################################ */}
            {/* Customer Section START here */}
            <PermissionGate permission="customer.view">
              <li className="nav-item mt-2">
                <button className="btn text-white w-100 d-flex align-items-center justify-content-between"
                  onClick={() =>
                    setCustomerOpen(!customerOpen)
                  }
                >
                  <span className="d-flex align-items-center">
                    <FaBuilding />

                    {!collapsed && (
                      <span className="ms-3">
                        Customer
                      </span>
                    )}
                  </span>

                  {!collapsed &&
                    (customerOpen ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    ))}
                </button>

                {customerOpen && !collapsed && (
                  <ul className="nav flex-column ms-4">
                    <li>
                      <Link href="/dashboard/customers" className="nav-link text-white">
                        List Costomers
                      </Link>
                    </li>
                  </ul>
                )}

              </li>
            </PermissionGate>

            {/* // Customer master END Here  */}
            {/* ############################################### */}
            {/* // comapny master Start Here  */}
            <PermissionGate permission="company.view">

              <li className="nav-item mt-2">
                <button className="btn text-white w-100 d-flex align-items-center justify-content-between"
                  onClick={() =>
                    setCompanyOpen(!companyOpen)
                  }
                >
                  <span className="d-flex align-items-center">
                    <FaBuilding />
                    {!collapsed && (
                      <span className="ms-3">
                        Company
                      </span>
                    )}
                  </span>

                  {!collapsed &&
                    (companyOpen ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    ))}
                </button>

                {companyOpen && !collapsed && (

                  <ul className="nav flex-column ms-4">
                    <li>
                      <Link href="/dashboard/company/create" className="nav-link text-white"> Create Company </Link>
                    </li>
                    <li>
                      <Link href="/dashboard/company/list" className="nav-link text-white"> List Company</Link>
                    </li>
                  </ul>
                )}

              </li>

            </PermissionGate>
            {/* // Company master END Here  */}
            {/* ############################################### */}
            {/* Financial year Start year */}
            <PermissionGate permission="financialyear.view">

              <li className="nav-item mt-2">
                <button className="btn text-white w-100 d-flex align-items-center justify-content-between"
                  onClick={() =>
                    setFyOpen(!fyOpen)
                  }
                >
                  <span className="d-flex align-items-center">
                    <FaCalendarAlt />
                    {!collapsed && (
                      <span className="ms-3"> Financial Year </span>
                    )}
                  </span>

                  {!collapsed &&
                    (fyOpen ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    ))}
                </button>

                {fyOpen && !collapsed && (

                  <ul className="nav flex-column ms-4">
                    <li>
                      <Link href="/dashboard/financial-year/create" className="nav-link text-white">  Create FY </Link>
                    </li>
                    <li>
                      <Link href="/dashboard/financial-year/list" className="nav-link text-white"> List FY </Link>
                    </li>
                  </ul>
                )}

              </li>
            </PermissionGate>

            {/* Financial year END year */}
            {/* ############################################### */}
            {/* Reports Section Start here  */}
            {/* <PermissionGate permission="reports.view">

                          <li className="nav-item mt-2">
                            <Link href="/dashboard/report" title={collapsed ? "Reports" : ""}
                                className={`nav-link d-flex align-items-center rounded px-3 py-2 ${
                                pathname.startsWith("#") ? "bg-primary text-white"
                                      : "text-white"
                                }`}
                              >
                                Sales Dashboard
                              </Link>
                            </li>

                        </PermissionGate> */}
            {/* Reports Section END here  */}
            {/* ########################################### */}
            {/* VFP Section Start here */}
            {(can("vfp.view") || can("vfp.settings")) && (
              <li className="nav-item mt-2">
                <button
                  title={collapsed ? "VFP Integration" : ""}
                  className="btn text-white w-100 d-flex align-items-center justify-content-between"
                  onClick={() => setVfpOpen(!vfpOpen)}
                >
                  <span className="d-flex align-items-center">
                    <FaExchangeAlt size={16} />
                    {!collapsed && (
                      <span className="ms-3"> VFP Integration </span>
                    )}
                  </span>

                  {!collapsed &&
                    (vfpOpen ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    ))}
                </button>

                {vfpOpen && !collapsed && (
                  <ul className="nav flex-column ms-4">
                    {can("vfp.view") && (
                      <li>
                        <Link href="/dashboard/vfp" className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname === "/dashboard/vfp"
                          ? "bg-primary text-white"
                          : "text-white"
                          }`}
                        >
                          Sync Console
                        </Link>
                      </li>
                    )}
                    {can("vfp.settings") && (
                      <li>
                        <Link href="/dashboard/vfp/settings" className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("/dashboard/vfp/settings")
                          ? "bg-primary text-white"
                          : "text-white"
                          }`}
                        >
                          VFP Settings
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}
            {/* VFP Section END here */}

            {/* Reports Section Start here  */}
            <PermissionGate permission="reports.view">

              <li className="nav-item mt-2">
                <Link href="/dashboard/reports" title={collapsed ? "Reports" : ""}
                  className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("#") ? "bg-primary text-white"
                    : "text-white"
                    }`}
                >
                  <FaChartBar />
                  {!collapsed && (
                    <span className="ms-3"> Reports </span>
                  )}
                </Link>
              </li>

            </PermissionGate>
            {/* Reports Section END here  */}
            {/* ########################################### */}
            {/* Settings Section STart here */}
            <PermissionGate permission="settings.edit">
              <li className="nav-item mt-2">
                <Link href="/dashboard/settings" title={collapsed ? "Settings" : ""}
                  className={`nav-link d-flex align-items-center rounded px-3 py-2 ${pathname.startsWith("/dashboard/settings")
                    ? "bg-primary text-white"
                    : "text-white"
                    }`}
                >
                  <FaCog />

                  {!collapsed && (
                    <span className="ms-3"> Company Settings </span>
                  )}
                </Link>
              </li>
            </PermissionGate>

            {/* Settings Section END here */}
          </ul>

        </div>


        {!collapsed && (
          <div
            className="border-top p-3"
            style={{
              backgroundColor: "#343872",
            }}
          >
            <small className="text-secondary">
              Logged in as
            </small>

            <div className="fw-bold">
              Company Admin
            </div>
          </div>
        )}


      </div>
    </div>
  );
}