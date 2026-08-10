"use client";
import { useState, useMemo } from "react";

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  Low:    { color: "#16a34a", bg: "#dcfce7" },
  Medium: { color: "#d97706", bg: "#fef3c7" },
  High:   { color: "#ea580c", bg: "#ffedd5" },
  Urgent: { color: "#dc2626", bg: "#fee2e2" },
};
const STAGE_COLORS: Record<string, { color: string; bg: string }> = {
  "New":              { color: "#6366f1", bg: "#eef2ff" },
  "Contacted":        { color: "#0ea5e9", bg: "#f0f9ff" },
  "Qualified":        { color: "#8b5cf6", bg: "#f5f3ff" },
  "Sample Delivered": { color: "#f59e0b", bg: "#fffbeb" },
  "Quotation Shared": { color: "#f97316", bg: "#fff7ed" },
  "Negotiation":      { color: "#ec4899", bg: "#fdf2f8" },
  "Won":              { color: "#22c55e", bg: "#f0fdf4" },
  "Lost":             { color: "#ef4444", bg: "#fef2f2" },
  "Dropped":          { color: "#6b7280", bg: "#f9fafb" },
};
const TYPE_EMOJI: Record<string, string> = {
  "Doctor": "🩺", "Chemist/Retailer": "💊", "Hospital/Nursing Home": "🏥",
  "Stockist/Distributor": "📦", "Export/International": "🌍", "B2B Bulk Buyer": "🏢",
  "Direct/OTC Customer": "🛒", "Franchise Inquiry": "🤝", "Generic Store": "🏪", "Other": "📋",
};

interface Props {
  leads: any[];
  onEdit: (lead: any) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (lead: any) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
}

type SortKey = "partyName" | "stage" | "priority" | "estimatedMonthlyValue" | "createdAt" | "nextFollowUpDate";

export default function LeadTable({ leads, onEdit, onDelete, onOpenDetail, selectedIds, onToggleSelect, onSelectAll }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [hovered, setHovered] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      let aVal = a[sortKey], bVal = b[sortKey];
      if (sortKey === "createdAt" || sortKey === "nextFollowUpDate") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [leads, sortKey, sortDir]);

  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  const thStyle: React.CSSProperties = {
    padding: "12px 16px", textAlign: "left", fontSize: 11,
    fontWeight: 700, color: "#64748b", textTransform: "uppercase",
    letterSpacing: "0.05em", cursor: "pointer", whiteSpace: "nowrap",
    userSelect: "none",
  };

  const SortArrow = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span style={{ color: "#cbd5e1", marginLeft: 4 }}>⇅</span>;
    return <span style={{ color: "#6366f1", marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
              <th style={{ ...thStyle, width: 40 }}>
                <input type="checkbox" checked={allSelected} onChange={onSelectAll}
                  style={{ width: 16, height: 16, accentColor: "#6366f1", cursor: "pointer" }} />
              </th>
              <th style={thStyle} onClick={() => handleSort("partyName")}>Party/Doctor <SortArrow k="partyName" /></th>
              <th style={thStyle}>Type</th>
              <th style={thStyle} onClick={() => handleSort("stage")}>Stage <SortArrow k="stage" /></th>
              <th style={thStyle} onClick={() => handleSort("priority")}>Priority <SortArrow k="priority" /></th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle} onClick={() => handleSort("estimatedMonthlyValue")}>Value/Mo <SortArrow k="estimatedMonthlyValue" /></th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle} onClick={() => handleSort("nextFollowUpDate")}>Follow-up <SortArrow k="nextFollowUpDate" /></th>
              <th style={thStyle}>Source</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={11} style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>No leads found</p>
                  <p style={{ margin: "6px 0 0", fontSize: 13 }}>Try adjusting your filters or add a new lead</p>
                </td>
              </tr>
            )}
            {sorted.map(lead => {
              const sc = STAGE_COLORS[lead.stage] || { color: "#6b7280", bg: "#f9fafb" };
              const pc = PRIORITY_COLORS[lead.priority] || { color: "#6b7280", bg: "#f9fafb" };
              const isSelected = selectedIds.includes(lead._id);
              const isHov = hovered === lead._id;
              const isOverdue = lead.nextFollowUpDate &&
                new Date(lead.nextFollowUpDate) < new Date() &&
                !["Won","Lost","Dropped"].includes(lead.stage);

              return (
                <tr key={lead._id}
                  onMouseEnter={() => setHovered(lead._id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: isSelected ? "#eef2ff" : isHov ? "#f8faff" : "#fff",
                    transition: "background 0.15s",
                  }}>
                  <td style={{ padding: "12px 16px" }}>
                    <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(lead._id)}
                      style={{ width: 16, height: 16, accentColor: "#6366f1", cursor: "pointer" }} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{TYPE_EMOJI[lead.leadType] || "📋"}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#0f172a", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.partyName}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{lead.leadNumber}</p>
                      </div>
                      {lead.isConverted && <span style={{ fontSize: 14 }} title="Converted">✅</span>}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 12, color: "#475569" }}>{lead.leadType?.split("/")[0]}</span>
                    {lead.speciality && <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{lead.speciality}</p>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                      background: sc.bg, color: sc.color,
                    }}>{lead.stage}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                      background: pc.bg, color: pc.color,
                    }}>{lead.priority}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {lead.contactPerson && <p style={{ margin: 0, fontWeight: 600, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.contactPerson}</p>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <span style={{ color: "#64748b" }}>{lead.phone}</span>
                        {(lead.whatsapp || lead.phone) && (
                          <a href={`https://wa.me/91${lead.whatsapp || lead.phone}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 14, textDecoration: "none" }} title="WhatsApp">💬</a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {lead.estimatedMonthlyValue > 0
                      ? <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>₹{Number(lead.estimatedMonthlyValue).toLocaleString("en-IN")}</span>
                      : <span style={{ color: "#cbd5e1", fontSize: 13 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 12, color: "#475569", maxWidth: 100, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.assignedTo?.name || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {lead.nextFollowUpDate
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? "#dc2626" : "#d97706" }}>
                          {isOverdue ? "⚠️ " : "📅 "}{new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN")}
                        </span>
                      : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, color: "#64748b", maxWidth: 100, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.source}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", opacity: isHov ? 1 : 0, transition: "opacity 0.2s" }}>
                      <button onClick={() => onOpenDetail(lead)} title="View" style={{
                        width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
                        background: "#eef2ff", color: "#6366f1", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>👁️</button>
                      <button onClick={() => onEdit(lead)} title="Edit" style={{
                        width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
                        background: "#fef3c7", color: "#d97706", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>✏️</button>
                      <button onClick={() => onDelete(lead._id)} title="Delete" style={{
                        width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
                        background: "#fee2e2", color: "#dc2626", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
