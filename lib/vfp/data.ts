import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import VfpTableMap from "@/models/VfpTableMap";

export type VfpTableSummary = {
  tableName: string;
  fileName: string;
  targetCollection: string;
  columns: Array<{
    name: string;
    type?: string;
  }>;
  recordCount: number;
};

export type VfpRowPage = {
  table?: VfpTableSummary;
  rows: Record<string, unknown>[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type VfpTableMapDocument = {
  fileName?: string;
  targetCollection?: string;
  columns?: Array<{
    name: string;
    type?: string;
  }>;
  recordCount?: number;
};

function toTableName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function clampPage(value: string | null) {
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export async function listVfpTables() {
  await dbConnect();

  const maps = await VfpTableMap.find({ enabled: true })
    .sort({ fileName: 1 })
    .lean();

  return (maps as VfpTableMapDocument[]).map((map) => ({
    tableName: toTableName(map.fileName || ""),
    fileName: map.fileName || "",
    targetCollection: map.targetCollection || "",
    columns: map.columns || [],
    recordCount: map.recordCount || 0,
  })) as VfpTableSummary[];
}

export async function getVfpTableRows(
  tableName: string,
  searchParams?: URLSearchParams
): Promise<VfpRowPage> {
  await dbConnect();

  const decodedTableName = decodeURIComponent(tableName);
  const table = await VfpTableMap.findOne({
    $or: [
      { fileName: `${decodedTableName}.dbf` },
      { fileName: new RegExp(`^${escapeRegExp(decodedTableName)}\\.dbf$`, "i") },
    ],
    enabled: true,
  }).lean();

  if (!table) {
    return {
      rows: [],
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
    };
  }

  const page = clampPage(searchParams?.get("page") || null);
  const limit = Math.min(Number(searchParams?.get("limit") || 50) || 50, 200);
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not ready");
  }

  const typedTable = table as VfpTableMapDocument;
  const targetCollection = typedTable.targetCollection || "";
  const exactTableName = toTableName(typedTable.fileName || "");
  const cursor = db
    .collection(targetCollection)
    .find({ _vfpTable: exactTableName })
    .sort({ _vfpRowNumber: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const [rows, total] = await Promise.all([
    cursor.toArray(),
    db.collection(targetCollection).countDocuments({ _vfpTable: exactTableName }),
  ]);

  return {
    table: {
      tableName: toTableName(typedTable.fileName || ""),
      fileName: typedTable.fileName || "",
      targetCollection,
      columns: typedTable.columns || [],
      recordCount: typedTable.recordCount || 0,
    },
    rows: rows.map((row) => JSON.parse(JSON.stringify(row))),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
