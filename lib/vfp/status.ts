import dbConnect from "@/lib/mongodb";
import VfpConflict from "@/models/VfpConflict";
import VfpFileAsset from "@/models/VfpFileAsset";
import VfpOutboundQueue from "@/models/VfpOutboundQueue";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpSyncLog from "@/models/VfpSyncLog";
import VfpSyncState from "@/models/VfpSyncState";
import VfpTableMap from "@/models/VfpTableMap";
import VfpWorkerHeartbeat from "@/models/VfpWorkerHeartbeat";

type SyncStateSummary = {
  lastSyncedAt?: Date;
  status?: string;
  lastImportedCount?: number;
};

type FileTypeSummary = {
  _id?: string;
  count: number;
};

export async function getVfpStatus() {
  await dbConnect();

  const [
    tableCount,
    states,
    recentLogs,
    conflictCount,
    pendingOutboundCount,
    pendingCommandCount,
    fileCount,
    storedFileCount,
    failedFileCount,
    fileSizeSummary,
    fileTypeSummary,
    recentFiles,
    workerHeartbeat,
  ] = await Promise.all([
    VfpTableMap.countDocuments({ enabled: true }),
    VfpSyncState.find({}).sort({ updatedAt: -1 }).lean(),
    VfpSyncLog.find({}).sort({ createdAt: -1 }).limit(10).lean(),
    VfpConflict.countDocuments({ status: "open" }),
    VfpOutboundQueue.countDocuments({ status: "pending" }),
    VfpSyncCommand.countDocuments({ status: "queued" }),
    VfpFileAsset.countDocuments({}),
    VfpFileAsset.countDocuments({ storageStatus: "stored" }),
    VfpFileAsset.countDocuments({ storageStatus: "failed" }),
    VfpFileAsset.aggregate([{ $group: { _id: null, bytes: { $sum: "$size" } } }]),
    VfpFileAsset.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$extension", "no extension"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    VfpFileAsset.find({}).sort({ lastSyncedAt: -1 }).limit(12).lean(),
    VfpWorkerHeartbeat.findOne({}).sort({ lastSeenAt: -1 }).lean(),
  ]);

  const typedStates = states as SyncStateSummary[];

  const lastSyncedDates = typedStates
    .map((state) => state.lastSyncedAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

  const failedTables = typedStates.filter((state) =>
    ["failed", "locked"].includes(state.status || "")
  );

  const importedRows = states.reduce(
    (total: number, state: SyncStateSummary) =>
      total + (state.lastImportedCount || 0),
    0
  );

  const trackedBytes = fileSizeSummary[0]?.bytes || 0;
  const fileTypes = (fileTypeSummary as FileTypeSummary[]).reduce<
    Record<string, number>
  >((acc, fileType) => {
    acc[fileType._id || "no extension"] = fileType.count;
    return acc;
  }, {});
  const dataDir = process.env.VFP_DATA_DIR || "";
  const dataDirExists = Boolean(dataDir);
  const heartbeat = workerHeartbeat as
    | {
        status?: string;
        lastSeenAt?: Date;
        lastError?: string;
        lastRunReason?: string;
      }
    | null;
  const lastSeenAt = heartbeat?.lastSeenAt
    ? new Date(heartbeat.lastSeenAt)
    : undefined;
  const workerOnline =
    Boolean(lastSeenAt) && Date.now() - Number(lastSeenAt) < 30_000;

  return {
    workerConfigured: Boolean(dataDir),
    workerOnline,
    workerStatus: heartbeat?.status || "offline",
    workerLastSeenAt: lastSeenAt,
    workerLastError: heartbeat?.lastError || "",
    workerLastRunReason: heartbeat?.lastRunReason || "",
    dataDir,
    dataDirExists,
    conflictPolicy: process.env.VFP_CONFLICT_POLICY || "vfp_wins",
    tableCount,
    importedRows,
    failedCount: failedTables.length,
    conflictCount,
    pendingOutboundCount,
    pendingCommandCount,
    fileCount,
    storedFileCount,
    failedFileCount,
    trackedBytes,
    fileTypes,
    recentFiles,
    lastSyncedAt: lastSyncedDates,
    states,
    recentLogs,
  };
}
