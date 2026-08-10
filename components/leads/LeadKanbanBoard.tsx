"use client";
import { useRef, useState } from "react";

const STAGES = [
  { key: "New",               label: "New",               color: "#6366f1", bg: "#eef2ff", dot: "#818cf8" },
  { key: "Contacted",         label: "Contacted",         color: "#0ea5e9", bg: "#f0f9ff", dot: "#38bdf8" },
  { key: "Qualified",         label: "Qualified",         color: "#8b5cf6", bg: "#f5f3ff", dot: "#a78bfa" },
  { key: "Sample Delivered",  label: "Sample Delivered",  color: "#f59e0b", bg: "#fffbeb", dot: "#fbbf24" },
  { key: "Quotation Shared",  label: "Quotation Shared",  color: "#f97316", bg: "#fff7ed", dot: "#fb923c" },
  { key: "Negotiation",       label: "Negotiation",       color: "#ec4899", bg: "#fdf2f8", dot: "#f472b6" },
  { key: "Won",               label: "Won 🏆",            color: "#22c55e", bg: "#f0fdf4", dot: "#4ade80" },
  { key: "Lost",              label: "Lost",              color: "#ef4444", bg: "#fef2f2", dot: "#f87171" },
];

const PRIORITY_COLORS: Record<string, string> = {
  Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", Urgent: "#ef4444",
};
const PRIORITY_BG: Record<string, string> = {
  Low: "#f0fdf4", Medium: "#fffbeb", High: "#fff7ed", Urgent: "#fef2f2",
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
  onStageChange: (leadId: string, newStage: string) => void;
}

function LeadCard({ lead, onEdit, onDelete, onOpen, onDragStart }: any) {
  const [hovered, setHovered] = useState(false);
  const pb = { color: PRIORITY_COLORS[lead.priority] || "#6b7280", bg: PRIORITY_BG[lead.priority] || "#f9fafb" };
  const isOverdue = lead.nextFollowUpDate &&
    new Date(lead.nextFollowUpDate) < new Date() &&
    !["Won","Lost"].includes(lead.stage);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead._id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1.5px solid #e2e8f0",
        padding: "14px 16px",
        cursor: "grab",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.12)" : "0 2px 6px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "all 0.2s ease",
        userSelect: "none",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_EMOJI[lead.leadType] || "📋"}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lead.partyName}
            </p>
            {lead.leadNumber && (
              <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{lead.leadNumber}</p>
            )}
          </div>
        </div>
        <span style={{
          flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "4px 10px",
          borderRadius: 8, background: pb.bg, color: pb.color, marginLeft: 6,
        }}>
          {lead.priority}
        </span>
      </div>

      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {lead.speciality && <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>🔬 {lead.speciality}</p>}
        {lead.city && <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>📍 {lead.city}{lead.state ? `, ${lead.state}` : ""}</p>}
        {lead.phone && <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>📞 {lead.phone}</p>}
        {lead.estimatedMonthlyValue > 0 && (
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
            💰 ₹{Number(lead.estimatedMonthlyValue).toLocaleString("en-IN")}/mo
          </p>
        )}
      </div>

      {/* Follow-up alert */}
      {isOverdue && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 600,
          padding: "6px 10px", borderRadius: 8, marginBottom: 8,
        }}>
          ⚠️ Overdue: {new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN")}
        </div>
      )}
      {!isOverdue && lead.nextFollowUpDate && !["Won","Lost"].includes(lead.stage) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#fffbeb", color: "#d97706", fontSize: 11, fontWeight: 600,
          padding: "6px 10px", borderRadius: 8, marginBottom: 8,
        }}>
          🕐 Follow-up: {new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN")}
        </div>
      )}

      {/* Tags */}
      {lead.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {lead.tags.slice(0, 3).map((t: string) => (
            <span key={t} style={{ fontSize: 10, background: "#eef2ff", color: "#6366f1", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>#{t}</span>
          ))}
        </div>
      )}

      {(lead.assignedToName || lead.assignedTo?.name) && (
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "#475569", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          👤 {lead.assignedToName || lead.assignedTo?.name}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6, opacity: hovered ? 1 : 0, transition: "opacity 0.2s" }}>
        <button onClick={() => onOpen(lead)} style={{
          flex: 1, padding: "7px", borderRadius: 10, border: "none",
          background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>View Details</button>
        {(lead.whatsapp || lead.phone) && (
          <a href={`https://wa.me/91${lead.whatsapp || lead.phone}`} target="_blank" rel="noopener noreferrer"
            style={{
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 10, background: "#dcfce7", color: "#16a34a", textDecoration: "none", fontSize: 16,
            }}>💬</a>
        )}
        <button onClick={() => onEdit(lead)} style={{
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 10, background: "#fef3c7", color: "#d97706", border: "none", cursor: "pointer", fontSize: 14,
        }}>✏️</button>
        <button onClick={() => onDelete(lead._id)} style={{
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 10, background: "#fee2e2", color: "#dc2626", border: "none", cursor: "pointer", fontSize: 14,
        }}>🗑️</button>
      </div>
    </div>
  );
}

export default function LeadKanbanBoard({ leads, onEdit, onDelete, onOpenDetail, onStageChange }: Props) {
  const dragId = useRef<string | null>(null);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    dragId.current = leadId;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDraggingOver(stage);
  };
  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (dragId.current) { onStageChange(dragId.current, stage); dragId.current = null; }
    setDraggingOver(null);
  };

  return (
    <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
      {STAGES.map(({ key, label, color, bg, dot }) => {
        const colLeads = leads.filter(l => l.stage === key);
        const totalValue = colLeads.reduce((s, l) => s + (l.estimatedMonthlyValue || 0), 0);
        const isTarget = draggingOver === key;

        return (
          <div key={key} style={{ flexShrink: 0, width: 270, display: "flex", flexDirection: "column" }}
            onDragOver={(e) => handleDragOver(e, key)}
            onDrop={(e) => handleDrop(e, key)}
            onDragLeave={() => setDraggingOver(null)}
          >
            {/* Column Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 14, marginBottom: 12,
              background: isTarget ? color + "25" : bg,
              border: `2px solid ${isTarget ? color : "transparent"}`,
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {totalValue > 0 && (
                  <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>
                    ₹{(totalValue / 1000).toFixed(0)}k
                  </span>
                )}
                <span style={{
                  background: color, color: "#fff", borderRadius: 20,
                  fontSize: 12, fontWeight: 700, padding: "2px 10px",
                }}>{colLeads.length}</span>
              </div>
            </div>

            {/* Drop hint */}
            {isTarget && (
              <div style={{
                border: `2px dashed ${color}`, borderRadius: 14, padding: 14,
                textAlign: "center", fontSize: 12, fontWeight: 600,
                color, background: color + "10", marginBottom: 10,
              }}>
                Drop here → {label}
              </div>
            )}

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {colLeads.length === 0 && !isTarget && (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: 80, color: "#cbd5e1", fontSize: 13,
                }}>
                  <span style={{ fontSize: 24, marginBottom: 4 }}>⊕</span>
                  Drag leads here
                </div>
              )}
              {colLeads.map(lead => (
                <LeadCard key={lead._id} lead={lead}
                  onEdit={onEdit} onDelete={onDelete} onOpen={onOpenDetail}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
