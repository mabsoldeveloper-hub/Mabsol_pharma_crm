"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaSlidersH,
  FaPlus,
  FaSearch,
  FaPaperPlane,
  FaTable,
  FaEdit,
  FaTrash,
  FaChartBar,
  FaGlobe,
  FaFileAlt,
  FaLayerGroup,
} from "react-icons/fa";

export default function CustomFormsHubPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/custom-forms/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Error fetching form templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete form "${title}"?`)) return;

    try {
      const res = await fetch(`/api/custom-forms/templates/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) => prev.filter((t) => t._id !== id && t.formId !== id));
      } else {
        alert(data.error || "Failed to delete form.");
      }
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category || "General")))];

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.formId.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || (t.category || "General") === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <FaSlidersH className="text-indigo-600 dark:text-indigo-400" />
            Custom Form Studio Hub (Enterprise)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Design dynamic forms, configure IF/THEN rules, share public QR links, and analyze visual KPIs.
          </p>
        </div>

        <Link
          href="/dashboard/custom-forms/builder"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <FaPlus /> Create New Custom Form
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved forms..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 font-medium animate-pulse">
          Loading saved custom forms...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <FaFileAlt className="mx-auto text-5xl text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
            No Custom Forms Found
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            You haven&apos;t created any forms yet or no forms match your search. Click below to design your first custom form.
          </p>
          <Link
            href="/dashboard/custom-forms/builder"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
          >
            <FaPlus /> Build Your First Form
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template._id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    {template.category || "General"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {template.accessMode === "Public" && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold px-2 py-0.5 rounded">
                        🌐 Public
                      </span>
                    )}
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        template.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {template.status || "Active"}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                  {template.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {template.description || "No description provided."}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <FaLayerGroup className="text-indigo-500" />{" "}
                    {template.fields?.length || 0} Configured Fields
                  </span>
                  <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                    {template.formId}
                  </span>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="pt-2 grid grid-cols-3 gap-2 text-xs">
                <Link
                  href={`/dashboard/custom-forms/entry/${template.formId}`}
                  className="py-2 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-center shadow-sm flex items-center justify-center gap-1 transition-all"
                >
                  <FaPaperPlane className="text-[10px]" /> Fill Entry
                </Link>

                <Link
                  href={`/dashboard/custom-forms/views/${template.formId}`}
                  className="py-2 px-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-center flex items-center justify-center gap-1 transition-all"
                >
                  <FaTable className="text-[10px] text-indigo-500" /> Data Table
                </Link>

                <Link
                  href={`/dashboard/custom-forms/analytics/${template.formId}`}
                  className="py-2 px-2 bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 font-semibold rounded-xl text-center flex items-center justify-center gap-1 transition-all"
                >
                  <FaChartBar className="text-[10px]" /> Analytics
                </Link>

                <Link
                  href={`/dashboard/custom-forms/builder/${template.formId}`}
                  className="col-span-2 py-1.5 px-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium rounded-lg text-center flex items-center justify-center gap-1 transition-all"
                >
                  <FaEdit className="text-xs" /> Edit Design & Logic
                </Link>

                <button
                  onClick={() => handleDeleteTemplate(template._id, template.title)}
                  className="col-span-1 py-1.5 px-3 border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 font-medium rounded-lg text-center flex items-center justify-center gap-1 transition-all"
                >
                  <FaTrash className="text-xs" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
