"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaUserTie,
  FaSitemap,
  FaBuilding,
  FaUserCheck,
  FaSearch,
  FaPlus,
  FaTrashAlt,
  FaSave,
  FaArrowLeft,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChevronRight,
  FaUsers,
  FaCrown,
  FaCheckSquare,
  FaSquare,
  FaTag,
} from "react-icons/fa";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  roleId?: { _id: string; roleName: string } | any;
  roleType?: string;
  reportsTo?: any;
  profilePhoto?: string;
}

interface RoleItem {
  _id: string;
  roleName: string;
  description?: string;
  status?: string;
}

interface CompanyItem {
  _id: string;
  companyCode: string;
  companyName: string;
}

interface DivisionItem {
  _id: string;
  companyCode: string;
  divisionCode: string;
  divisionName: string;
}

interface SubDivisionItem {
  _id: string;
  companyCode: string;
  divisionCode: string;
  subDivisionCode: string;
  subDivisionName: string;
}

interface CategoryItem {
  _id: string;
  companyCode: string;
  divisionCode: string;
  subDivisionCode: string;
  categoryCode: string;
  categoryName: string;
}

interface CustomerOption {
  uniqueId: string;
  code: string;
  name: string;
  city?: string;
  area?: string;
}

interface TerritoryScopeItem {
  companyCode: string;
  companyName: string;
  divisionCode: string;
  divisionName: string;
  subDivisionCode?: string;
  subDivisionName?: string;
  categoryCode?: string;
  categoryName?: string;
  notes?: string;
}

export default function UserAssignmentWorkbenchPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [dynamicRoles, setDynamicRoles] = useState<RoleItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [subDivisions, setSubDivisions] = useState<SubDivisionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);

  // Selected User State
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Active Tab: "hierarchy" | "scope" | "parties" | "summary"
  const [activeTab, setActiveTab] = useState<"hierarchy" | "scope" | "parties" | "summary">("hierarchy");

  // Loading & Saving States
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User Filter State
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Tab 1: Hierarchy State
  const [roleLevel, setRoleLevel] = useState<string>("MR");
  const [reportsTo, setReportsTo] = useState<string>("");
  const [stateName, setStateName] = useState<string>("");
  const [zoneName, setZoneName] = useState<string>("");
  const [regionName, setRegionName] = useState<string>("");
  const [territoryName, setTerritoryName] = useState<string>("");
  const [hierarchyNotes, setHierarchyNotes] = useState<string>("");
  const [directReports, setDirectReports] = useState<any[]>([]);

  // Tab 2: Scope State
  const [assignedScopes, setAssignedScopes] = useState<TerritoryScopeItem[]>([]);
  const [newScopeCompanyCode, setNewScopeCompanyCode] = useState<string>("");
  const [newScopeDivisionCode, setNewScopeDivisionCode] = useState<string>("");
  const [newScopeSubDivisionCode, setNewScopeSubDivisionCode] = useState<string>("");
  const [newScopeCategoryCode, setNewScopeCategoryCode] = useState<string>("");

  // Tab 3: Party Assignment State
  const [partySearch, setPartySearch] = useState("");
  const [selectedCustomerKeys, setSelectedCustomerKeys] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------
  // Initial Data Fetching
  // -------------------------------------------------------------
  useEffect(() => {
    fetchAllMasters();
  }, []);

  async function fetchAllMasters() {
    setLoadingUsers(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchCompanies(),
        fetchDivisions(),
        fetchSubDivisions(),
        fetchCategories(),
        fetchCustomers(),
      ]);
    } catch (e) {
      setError("Error initializing assignment workbench.");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchUsers() {
    const res = await fetch("/api/users");
    const json = await res.json();
    if (json.success || Array.isArray(json)) {
      const list = Array.isArray(json) ? json : json.users || json.data || [];
      setUsers(list);
    }
  }

  async function fetchRoles() {
    try {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (Array.isArray(json)) {
        setDynamicRoles(json);
      } else if (json.data && Array.isArray(json.data)) {
        setDynamicRoles(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch dynamic roles", e);
    }
  }

  async function fetchCompanies() {
    const res = await fetch("/api/master/fetch-company-master");
    const json = await res.json();
    if (json.success) setCompanies(json.data || []);
  }

  async function fetchDivisions() {
    const res = await fetch("/api/division-master");
    const json = await res.json();
    if (json.success) setDivisions(json.data || []);
  }

  async function fetchSubDivisions() {
    const res = await fetch("/api/sub-division-master");
    const json = await res.json();
    if (json.success) setSubDivisions(json.data || []);
  }

  async function fetchCategories() {
    const res = await fetch("/api/category-master");
    const json = await res.json();
    if (json.success) setCategories(json.data || []);
  }

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/reports/customer?report=master&limit=5000");
      const json = await res.json();
      if (json.success && json.data?.rows) {
        const list = json.data.rows.map((c: any, index: number) => {
          const code = (c.CODEP || c.CODE || c.ORDNO || "").toString().trim();
          const name = (c.PARNAM || c.customerName || "Unknown Party").toString().trim();
          const city = (c.CITY || "").toString().trim();
          const area = (c.AREA || "").toString().trim();
          return {
            uniqueId: `${code || "nocode"}_${name}_${index}`,
            code,
            name,
            city,
            area,
          };
        });
        setAllCustomers(list);
      }
    } catch (e) {
      console.error("Failed to load party list", e);
    }
  }

  // -------------------------------------------------------------
  // User Selection & Data Loading
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      resetUserForm();
      return;
    }

    const u = users.find((item) => item._id === selectedUserId);
    if (u) {
      setSelectedUser(u);
      loadUserAssignmentDetails(u._id);
    }
  }, [selectedUserId]);

  function resetUserForm() {
    setRoleLevel("MR");
    setReportsTo("");
    setStateName("");
    setZoneName("");
    setRegionName("");
    setTerritoryName("");
    setHierarchyNotes("");
    setDirectReports([]);
    setAssignedScopes([]);
    setSelectedCustomerKeys(new Set());
  }

  async function loadUserAssignmentDetails(userId: string) {
    setLoadingDetails(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/assignment?userId=${userId}`);
      const json = await res.json();

      if (json.success && json.data) {
        const { user, hierarchy, territories, partyAssignments, directReports } = json.data;

        // Populate Hierarchy Role
        const userRoleName = typeof user?.roleId === "object" ? user?.roleId?.roleName : user?.roleType || "";
        const level = hierarchy?.roleLevel || userRoleName || "MR";
        setRoleLevel(level);

        // Check if Admin
        const isAdmin = userRoleName.toLowerCase().includes("admin") || level.toLowerCase().includes("admin");
        if (isAdmin) {
          setReportsTo("");
        } else {
          const managerId = typeof user?.reportsTo === "object" ? user?.reportsTo?._id : user?.reportsTo || hierarchy?.reportsTo || "";
          setReportsTo(managerId || "");
        }

        setStateName(hierarchy?.state || "");
        setZoneName(hierarchy?.zone || "");
        setRegionName(hierarchy?.region || "");
        setTerritoryName(hierarchy?.territory || "");
        setHierarchyNotes(hierarchy?.notes || "");
        setDirectReports(directReports || []);

        // Populate Scope
        if (Array.isArray(territories)) {
          const scopes: TerritoryScopeItem[] = territories.map((t: any) => ({
            companyCode: t.companyCode,
            companyName: t.companyName,
            divisionCode: t.divisionCode,
            divisionName: t.divisionName,
            subDivisionCode: t.subDivisionCode || "",
            subDivisionName: t.subDivisionName || "",
            categoryCode: t.categoryCode || "",
            categoryName: t.categoryName || "",
            notes: t.notes || "",
          }));
          setAssignedScopes(scopes);
        } else {
          setAssignedScopes([]);
        }

        // Populate Customer Assignments
        if (Array.isArray(partyAssignments) && allCustomers.length > 0) {
          const activeCodes = new Set(partyAssignments.map((a: any) => (a.customerCode || "").trim().toLowerCase()));
          const activeNames = new Set(partyAssignments.map((a: any) => (a.customerName || "").trim().toLowerCase()));

          const activeKeys = new Set<string>();
          allCustomers.forEach((c) => {
            const codeKey = c.code ? c.code.toLowerCase() : "";
            const nameKey = c.name ? c.name.toLowerCase() : "";
            if ((codeKey && activeCodes.has(codeKey)) || (nameKey && activeNames.has(nameKey))) {
              activeKeys.add(c.uniqueId);
            }
          });
          setSelectedCustomerKeys(activeKeys);
        } else {
          setSelectedCustomerKeys(new Set());
        }
      }
    } catch (e) {
      setError("Failed to load assignment details for user.");
    } finally {
      setLoadingDetails(false);
    }
  }

  // Check if selected user is Admin
  const isSelectedUserAdmin = useMemo(() => {
    if (!selectedUser) return false;
    const rName = (
      typeof selectedUser.roleId === "object"
        ? selectedUser.roleId?.roleName || ""
        : selectedUser.roleType || ""
    ).toLowerCase();
    return rName.includes("admin") || roleLevel.toLowerCase().includes("admin");
  }, [selectedUser, roleLevel]);

  // Filtered Users List for Left Sidebar
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.trim().toLowerCase();
      const roleName = typeof u.roleId === "object" ? u.roleId?.roleName || "" : u.roleType || "";
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(q)) ||
        roleName.toLowerCase().includes(q);

      const matchRole = !roleFilter || u.roleType === roleFilter || roleName === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, userSearch, roleFilter]);

  // Cascading Scope Dropdowns
  const scopeDivisions = useMemo(() => {
    return newScopeCompanyCode ? divisions.filter((d) => d.companyCode === newScopeCompanyCode) : [];
  }, [divisions, newScopeCompanyCode]);

  const scopeSubDivisions = useMemo(() => {
    return newScopeCompanyCode && newScopeDivisionCode
      ? subDivisions.filter((s) => s.companyCode === newScopeCompanyCode && s.divisionCode === newScopeDivisionCode)
      : [];
  }, [subDivisions, newScopeCompanyCode, newScopeDivisionCode]);

  const scopeCategories = useMemo(() => {
    return newScopeCompanyCode && newScopeDivisionCode
      ? categories.filter(
        (c) =>
          c.companyCode === newScopeCompanyCode &&
          c.divisionCode === newScopeDivisionCode &&
          (!newScopeSubDivisionCode || c.subDivisionCode === newScopeSubDivisionCode)
      )
      : [];
  }, [categories, newScopeCompanyCode, newScopeDivisionCode, newScopeSubDivisionCode]);

  // Filtered Parties List for Tab 3
  const filteredParties = useMemo(() => {
    if (!partySearch) return allCustomers;
    const q = partySearch.toLowerCase();
    return allCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.area && c.area.toLowerCase().includes(q))
    );
  }, [allCustomers, partySearch]);

  // Add Product Scope Item to state
  function handleAddScope() {
    if (!newScopeCompanyCode || !newScopeDivisionCode) {
      setError("Please select both a Company and a Division.");
      return;
    }

    const comp = companies.find((c) => c.companyCode === newScopeCompanyCode);
    const div = scopeDivisions.find((d) => d.divisionCode === newScopeDivisionCode);
    const subDiv = scopeSubDivisions.find((s) => s.subDivisionCode === newScopeSubDivisionCode);
    const cat = scopeCategories.find((c) => c.categoryCode === newScopeCategoryCode);

    const newScope: TerritoryScopeItem = {
      companyCode: newScopeCompanyCode,
      companyName: comp?.companyName || newScopeCompanyCode,
      divisionCode: newScopeDivisionCode,
      divisionName: div?.divisionName || newScopeDivisionCode,
      subDivisionCode: newScopeSubDivisionCode || "",
      subDivisionName: subDiv?.subDivisionName || "",
      categoryCode: newScopeCategoryCode || "",
      categoryName: cat?.categoryName || "",
    };

    const exists = assignedScopes.some(
      (s) =>
        s.companyCode === newScope.companyCode &&
        s.divisionCode === newScope.divisionCode &&
        s.subDivisionCode === newScope.subDivisionCode &&
        s.categoryCode === newScope.categoryCode
    );

    if (exists) {
      setError("This product/division scope is already added.");
      return;
    }

    setAssignedScopes([...assignedScopes, newScope]);
    setNewScopeSubDivisionCode("");
    setNewScopeCategoryCode("");
    setError(null);
  }

  function handleRemoveScope(index: number) {
    setAssignedScopes(assignedScopes.filter((_, i) => i !== index));
  }

  // Toggle Party Checkbox
  function togglePartySelect(uniqueId: string) {
    setSelectedCustomerKeys((prev) => {
      const updated = new Set(prev);
      if (updated.has(uniqueId)) {
        updated.delete(uniqueId);
      } else {
        updated.add(uniqueId);
      }
      return updated;
    });
  }

  function handleSelectAllVisibleParties() {
    setSelectedCustomerKeys((prev) => {
      const updated = new Set(prev);
      filteredParties.forEach((c) => updated.add(c.uniqueId));
      return updated;
    });
  }

  function handleDeselectAllVisibleParties() {
    setSelectedCustomerKeys((prev) => {
      const updated = new Set(prev);
      filteredParties.forEach((c) => updated.delete(c.uniqueId));
      return updated;
    });
  }

  // Save All Assignments
  async function handleSaveAllAssignments() {
    if (!selectedUserId) {
      setError("Please select an Executive User first.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const assignedCustomers = allCustomers
      .filter((c) => selectedCustomerKeys.has(c.uniqueId))
      .map((c) => ({
        customerCode: c.code || c.name,
        customerName: c.name,
        city: c.city,
        area: c.area,
      }));

    try {
      const payload = {
        userId: selectedUserId,
        roleLevel,
        reportsTo: isSelectedUserAdmin ? null : (reportsTo || null),
        state: stateName,
        zone: zoneName,
        region: regionName,
        territory: territoryName,
        notes: hierarchyNotes,
        territoryScopes: assignedScopes,
        assignedCustomers,
      };

      const res = await fetch("/api/users/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(json.message || "All user assignments saved successfully!");
        fetchUsers();
        loadUserAssignmentDetails(selectedUserId);
      } else {
        setError(json.message || "Failed to save assignments.");
      }
    } catch {
      setError("An unexpected error occurred while saving assignments.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 p-6 text-white shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center gap-1.5">
                <FaUserCheck /> Dynamic Role & Hierarchy Assignment Workbench
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Role Master Integration
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Executive Assignment Workbench</h1>
            <p className="text-xs text-white/80 mt-1">
              Seamlessly assign Reporting Managers (Hierarchy), Dynamic Roles from Role Master, Companies, Divisions, Sub-Divisions, Categories, Products, and Specific Parties.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/users"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 transition-all"
            >
              <FaArrowLeft /> Back to Users
            </Link>
            {selectedUserId && (
              <button
                onClick={handleSaveAllAssignments}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-105"
              >
                <FaSave /> {saving ? "Saving..." : "Save All Assignments"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-rose-500 text-base" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><FaTimes className="text-rose-400" /></button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-emerald-500 text-base" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)}><FaTimes className="text-emerald-400" /></button>
        </div>
      )}

      {/* Main Grid: Left Panel (User Selector) + Right Panel (Assignment Workbench) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT SIDEBAR: Executive User Selector — TABLE FORMAT */}
        <div className="lg:col-span-4 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col h-[750px]">
          <div className="pb-3 border-b border-slate-100 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FaUsers className="text-indigo-600" /> Select Executive User
            </h3>

            {/* Search Input */}
            <div className="relative">
              <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search user by name, code..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Dynamic Role Filter Dropdown */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
            >
              <option value="">All Roles (from Role Master)</option>
              {dynamicRoles.map((r) => (
                <option key={r._id} value={r.roleName}>
                  {r.roleName}
                </option>
              ))}
            </select>
          </div>

          {/* User Table */}
          <div className="flex-1 overflow-y-auto mt-3 border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-2.5">Executive</th>
                  <th className="p-2.5">Code / Email</th>
                  <th className="p-2.5 text-right">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-xs font-semibold text-slate-400">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-xs font-semibold text-slate-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = u._id === selectedUserId;
                    const roleName = typeof u.roleId === "object" ? u.roleId?.roleName : u.roleType || "Executive";

                    return (
                      <tr
                        key={u._id}
                        onClick={() => setSelectedUserId(u._id)}
                        className={`cursor-pointer transition-all ${isSelected ? "bg-indigo-600 text-white" : "hover:bg-slate-50 text-slate-700"
                          }`}
                      >
                        <td className="p-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
                                }`}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold leading-tight">{u.name}</span>
                          </div>
                        </td>
                        <td className={`p-2.5 ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                          {u.employeeCode ? u.employeeCode : u.email}
                        </td>
                        <td className="p-2.5 text-right">
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${isSelected
                              ? "bg-white/20 text-white border-white/30"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                          >
                            {roleName}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT WORKBENCH PANEL */}
        <div className="lg:col-span-8 space-y-4">
          {selectedUserId && selectedUser ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-6 shadow-sm min-h-[750px] flex flex-col justify-between">

              <div className="space-y-6">
                {/* Executive Header Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl bg-gradient-to-r from-slate-100 via-indigo-50 to-slate-100 border border-indigo-100/80 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">{selectedUser.name}</h2>
                      <p className="text-xs text-slate-500">
                        {selectedUser.email} {selectedUser.employeeCode ? `• Code: ${selectedUser.employeeCode}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Role Master: {typeof selectedUser.roleId === "object" ? selectedUser.roleId?.roleName : roleLevel || "Executive"}
                    </span>
                  </div>
                </div>

                {/* WORKBENCH TABS */}
                <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setActiveTab("hierarchy")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === "hierarchy"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                  >
                    <FaSitemap /> 1. Reporting Hierarchy
                  </button>

                  <button
                    onClick={() => setActiveTab("scope")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === "scope"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                  >
                    <FaBuilding /> 2. Company & Product Scope ({assignedScopes.length})
                  </button>

                  <button
                    onClick={() => setActiveTab("parties")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === "parties"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                  >
                    <FaUserCheck /> 3. Party / Customer Mapping ({selectedCustomerKeys.size})
                  </button>

                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === "summary"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                  >
                    <FaTag /> 4. 360° Summary Matrix
                  </button>
                </div>

                {/* TAB CONTENT PANELS */}
                {loadingDetails ? (
                  <div className="py-20 text-center text-xs font-semibold text-slate-400">Loading user assignment details...</div>
                ) : (
                  <>
                    {/* TAB 1: REPORTING HIERARCHY */}
                    {activeTab === "hierarchy" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Hierarchy Role Level (from Role Master) *
                            </label>
                            <select
                              value={roleLevel}
                              onChange={(e) => setRoleLevel(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                            >
                              {dynamicRoles.map((r) => (
                                <option key={r._id} value={r.roleName}>
                                  {r.roleName}
                                </option>
                              ))}
                              {roleLevel && !dynamicRoles.some((r) => r.roleName === roleLevel) && (
                                <option value={roleLevel}>{roleLevel}</option>
                              )}
                            </select>
                          </div>

                          <div>
                            {isSelectedUserAdmin ? (
                              <div className="h-full flex flex-col justify-end">
                                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                                  <FaCrown className="text-amber-600 text-sm" />
                                  <span>Super Admin (Top Level Authority - Does Not Report To Anyone)</span>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Reports To (Parent Manager)
                                </label>
                                <select
                                  value={reportsTo}
                                  onChange={(e) => setReportsTo(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                                >
                                  <option value="">-- None (Top Level Executive) --</option>
                                  {users
                                    .filter((u) => u._id !== selectedUserId)
                                    .map((u) => {
                                      const managerRole = typeof u.roleId === "object" ? u.roleId?.roleName : u.roleType || "";
                                      return (
                                        <option key={u._id} value={u._id}>
                                          {u.name} {u.employeeCode ? `(${u.employeeCode})` : ""} - {managerRole || "Executive"}
                                        </option>
                                      );
                                    })}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">State / Zone Jurisdiction</label>
                            <input
                              type="text"
                              value={stateName}
                              onChange={(e) => setStateName(e.target.value)}
                              placeholder="e.g. Uttar Pradesh"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Region / HQ Territory</label>
                            <input
                              type="text"
                              value={regionName}
                              onChange={(e) => setRegionName(e.target.value)}
                              placeholder="e.g. Lucknow HQ"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                            />
                          </div>
                        </div>

                        {/* Direct Downline Subordinates — TABLE FORMAT */}
                        <div className="pt-3 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                            <FaUsers className="text-indigo-600" /> Direct Downline Team Reporting to {selectedUser.name} ({directReports.length})
                          </h4>

                          <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                                  <th className="p-3">Name</th>
                                  <th className="p-3">Code / Email</th>
                                  <th className="p-3 text-right">Role</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {directReports.length === 0 ? (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400">
                                      No employees currently report directly to this executive.
                                    </td>
                                  </tr>
                                ) : (
                                  directReports.map((r) => (
                                    <tr key={r._id} className="hover:bg-slate-50">
                                      <td className="p-3 font-bold text-slate-800">{r.name}</td>
                                      <td className="p-3 text-slate-400">{r.employeeCode ? r.employeeCode : r.email}</td>
                                      <td className="p-3 text-right">
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                          {typeof r.roleId === "object" ? r.roleId?.roleName : r.roleType || "Subordinate"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: COMPANY & PRODUCT SCOPE */}
                    {activeTab === "scope" && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                            + Add Product / Division Scope
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Company *</label>
                              <select
                                value={newScopeCompanyCode}
                                onChange={(e) => {
                                  setNewScopeCompanyCode(e.target.value);
                                  setNewScopeDivisionCode("");
                                  setNewScopeSubDivisionCode("");
                                  setNewScopeCategoryCode("");
                                }}
                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
                              >
                                <option value="">-- Company --</option>
                                {companies.map((c) => (
                                  <option key={c._id} value={c.companyCode}>
                                    {c.companyName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Division *</label>
                              <select
                                value={newScopeDivisionCode}
                                disabled={!newScopeCompanyCode}
                                onChange={(e) => {
                                  setNewScopeDivisionCode(e.target.value);
                                  setNewScopeSubDivisionCode("");
                                  setNewScopeCategoryCode("");
                                }}
                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold disabled:opacity-50"
                              >
                                <option value="">-- Division --</option>
                                {scopeDivisions.map((d) => (
                                  <option key={d._id} value={d.divisionCode}>
                                    {d.divisionName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Sub-Division (Optional)</label>
                              <select
                                value={newScopeSubDivisionCode}
                                disabled={!newScopeDivisionCode}
                                onChange={(e) => setNewScopeSubDivisionCode(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold disabled:opacity-50"
                              >
                                <option value="">All Sub-Divisions</option>
                                {scopeSubDivisions.map((s) => (
                                  <option key={s._id} value={s.subDivisionCode}>
                                    {s.subDivisionName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Category (Optional)</label>
                              <select
                                value={newScopeCategoryCode}
                                disabled={!newScopeDivisionCode}
                                onChange={(e) => setNewScopeCategoryCode(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold disabled:opacity-50"
                              >
                                <option value="">All Categories</option>
                                {scopeCategories.map((c) => (
                                  <option key={c._id} value={c.categoryCode}>
                                    {c.categoryName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleAddScope}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
                            >
                              <FaPlus /> Add Scope
                            </button>
                          </div>
                        </div>

                        {/* Assigned Scopes Table */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                                <th className="p-3">Company</th>
                                <th className="p-3">Division</th>
                                <th className="p-3">Sub-Division</th>
                                <th className="p-3">Category</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {assignedScopes.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-6 text-center text-slate-400">
                                    No product/division scope assigned yet.
                                  </td>
                                </tr>
                              ) : (
                                assignedScopes.map((scope, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-3 font-bold text-slate-900">{scope.companyName}</td>
                                    <td className="p-3 font-bold text-indigo-700">{scope.divisionName}</td>
                                    <td className="p-3 text-slate-600">{scope.subDivisionName || "All Sub-Divisions"}</td>
                                    <td className="p-3 text-slate-600">{scope.categoryName || "All Categories"}</td>
                                    <td className="p-3 text-right">
                                      <button
                                        onClick={() => handleRemoveScope(idx)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                                      >
                                        <FaTrashAlt />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: PARTY / CUSTOMER MAPPING — TABLE FORMAT */}
                    {activeTab === "parties" && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="relative w-full sm:w-80">
                            <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search party name, code, city..."
                              value={partySearch}
                              onChange={(e) => setPartySearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                              Assigned Parties: <span className="text-indigo-600">{selectedCustomerKeys.size}</span>
                            </span>
                            <button
                              type="button"
                              onClick={handleSelectAllVisibleParties}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                            >
                              Select Visible
                            </button>
                            <button
                              type="button"
                              onClick={handleDeselectAllVisibleParties}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            >
                              Deselect Visible
                            </button>
                          </div>
                        </div>

                        {/* Party Table */}
                        <div className="max-h-[420px] overflow-y-auto border border-slate-200 rounded-2xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10">
                              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                                <th className="p-3 w-8"></th>
                                <th className="p-3">Party Name</th>
                                <th className="p-3">Code</th>
                                <th className="p-3">City</th>
                                <th className="p-3">Area</th>
                                <th className="p-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredParties.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-xs font-semibold text-slate-400">
                                    No parties found.
                                  </td>
                                </tr>
                              ) : (
                                filteredParties.map((c) => {
                                  const isChecked = selectedCustomerKeys.has(c.uniqueId);
                                  return (
                                    <tr
                                      key={c.uniqueId}
                                      onClick={() => togglePartySelect(c.uniqueId)}
                                      className={`cursor-pointer transition-all ${isChecked ? "bg-indigo-50/80 text-indigo-950" : "hover:bg-slate-50 text-slate-700"
                                        }`}
                                    >
                                      <td className="p-3">
                                        <div className={`text-sm ${isChecked ? "text-indigo-600" : "text-slate-300"}`}>
                                          {isChecked ? <FaCheckSquare /> : <FaSquare />}
                                        </div>
                                      </td>
                                      <td className="p-3 font-bold">{c.name}</td>
                                      <td className="p-3 text-slate-500">{c.code || "N/A"}</td>
                                      <td className="p-3 text-slate-500">{c.city || "—"}</td>
                                      <td className="p-3 text-slate-500">{c.area || "—"}</td>
                                      <td className="p-3 text-right">
                                        {isChecked && (
                                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                            Assigned
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: 360° SUMMARY MATRIX — TABLE FORMAT */}
                    {activeTab === "summary" && (
                      <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-4 shadow-lg">
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-sm font-extrabold flex items-center gap-2">
                              <FaCrown className="text-amber-400" /> Executive Ownership Matrix
                            </h3>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
                              Role: {roleLevel || selectedUser.roleType || "Executive"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                              <p className="text-white/60 text-[11px]">Reporting Manager</p>
                              <p className="font-bold text-white mt-1">
                                {isSelectedUserAdmin
                                  ? "Top Authority (Does Not Report To Anyone)"
                                  : users.find((u) => u._id === reportsTo)?.name || "Top Level Executive / Admin"}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                              <p className="text-white/60 text-[11px]">Assigned Product Scopes</p>
                              <p className="font-bold text-emerald-400 mt-1">{assignedScopes.length} Division(s)</p>
                            </div>

                            <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                              <p className="text-white/60 text-[11px]">Assigned Parties / Customers</p>
                              <p className="font-bold text-teal-300 mt-1">{selectedCustomerKeys.size} Party(ies)</p>
                            </div>
                          </div>
                        </div>

                        {/* Summary breakdown tables */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-slate-100 border-b border-slate-200 p-3">
                              <h4 className="font-bold text-slate-800">Assigned Companies & Divisions</h4>
                            </div>
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                                  <th className="p-2.5">Company</th>
                                  <th className="p-2.5">Division</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {assignedScopes.length === 0 ? (
                                  <tr>
                                    <td colSpan={2} className="p-4 text-center text-slate-400 text-[11px]">
                                      No division scopes added.
                                    </td>
                                  </tr>
                                ) : (
                                  assignedScopes.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                      <td className="p-2.5 font-medium text-slate-700 flex items-center gap-1.5">
                                        <FaChevronRight size={9} className="text-indigo-500" /> {s.companyName}
                                      </td>
                                      <td className="p-2.5 font-bold text-indigo-700">{s.divisionName}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-slate-100 border-b border-slate-200 p-3">
                              <h4 className="font-bold text-slate-800">Direct Subordinates ({directReports.length})</h4>
                            </div>
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                                  <th className="p-2.5">Name</th>
                                  <th className="p-2.5 text-right">Role</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {directReports.length === 0 ? (
                                  <tr>
                                    <td colSpan={2} className="p-4 text-center text-slate-400 text-[11px]">
                                      No direct reportees.
                                    </td>
                                  </tr>
                                ) : (
                                  directReports.map((r) => (
                                    <tr key={r._id} className="hover:bg-slate-50">
                                      <td className="p-2.5 font-medium text-slate-700">
                                        {r.name} <span className="text-slate-400 font-normal">({r.employeeCode || r.email})</span>
                                      </td>
                                      <td className="p-2.5 text-right">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                          {typeof r.roleId === "object" ? r.roleId?.roleName : r.roleType || "Subordinate"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center mt-6">
                <span className="text-xs text-slate-500">
                  Editing assignments for: <strong className="text-slate-900">{selectedUser.name}</strong>
                </span>

                <button
                  onClick={handleSaveAllAssignments}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md flex items-center gap-2 transition-all hover:scale-105"
                >
                  <FaSave /> {saving ? "Saving All..." : "Save All Assignments"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-dashed border-slate-300 p-16 text-center space-y-3 min-h-[750px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">
                <FaUserTie />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">No Executive Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Select any executive from the left panel to configure their reporting manager, dynamic role from Role Master, product scope, and assigned parties.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}