/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const mongoose = require("mongoose");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

loadEnv(path.join(PROJECT_ROOT, ".env"));

const VFP_DATA_DIR = process.env.VFP_DATA_DIR;
const MONGODB_URI = process.env.MONGODB_URI;
const SYNC_INTERVAL_MS = Number(process.env.VFP_SYNC_INTERVAL_MS || 10000);
const DEBOUNCE_MS = Number(process.env.VFP_DEBOUNCE_MS || 2000);
const CONFLICT_POLICY = process.env.VFP_CONFLICT_POLICY || "vfp_wins";
const VFP_ENCODING = process.env.VFP_ENCODING || "latin1";
const FILE_SNAPSHOT_MAX_BYTES = Number(
  process.env.VFP_FILE_MAX_SNAPSHOT_BYTES || 25 * 1024 * 1024
);

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required in .env");
}

if (!VFP_DATA_DIR) {
  throw new Error("VFP_DATA_DIR is required in .env");
}

if (!fs.existsSync(VFP_DATA_DIR)) {
  throw new Error(`VFP_DATA_DIR does not exist: ${VFP_DATA_DIR}`);
}

const TableMap = mongoose.model(
  "VfpTableMap",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
  "vfptablemaps"
);
const SyncState = mongoose.model(
  "VfpSyncState",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
  "vfpsyncstates"
);
const SyncLog = mongoose.model(
  "VfpSyncLog",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
  "vfpsynclogs"
);
const SyncCommand = mongoose.model(
  "VfpSyncCommand",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
  "vfpsynccommands"
);
const OutboundQueue = mongoose.model(
  "VfpOutboundQueue",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
  "vfpoutboundqueues"
);
const Conflict = mongoose.model(
  "VfpConflict",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
  "vfpconflicts"
);
const FileAsset = mongoose.model(
  "VfpFileAsset",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
  "vfpfileassets"
);
const WorkerHeartbeat = mongoose.model(
  "VfpWorkerHeartbeat",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
  "vfpworkerheartbeats"
);

let scheduledTimer = null;
let isRunning = false;
const WORKER_ID = `${require("node:os").hostname()}-${process.pid}`;

main().catch((error) => {
  console.error("[vfp-sync] Fatal error:", error);
  process.exitCode = 1;
});

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`[vfp-sync] Connected to MongoDB`);
  console.log(`[vfp-sync] Watching ${VFP_DATA_DIR}`);

  await updateHeartbeat("online");
  scheduleSync("startup");
  startWatcher();
  setInterval(() => scheduleSync("interval"), SYNC_INTERVAL_MS);
  setInterval(processCommands, Math.max(3000, Math.floor(SYNC_INTERVAL_MS / 2)));
  setInterval(() => updateHeartbeat(isRunning ? "syncing" : "online"), 10000);
}

function startWatcher() {
  try {
    fs.watch(VFP_DATA_DIR, { recursive: true }, (_eventType, fileName) => {
      if (!fileName) {
        return;
      }

      scheduleSync(`file:${fileName}`);
    });
  } catch (error) {
    console.warn("[vfp-sync] Recursive watch unavailable, using interval only.");
    console.warn(error.message);
  }
}

function scheduleSync(reason) {
  clearTimeout(scheduledTimer);
  scheduledTimer = setTimeout(() => {
    runSync(reason).catch((error) => {
      console.error("[vfp-sync] Sync failed:", error);
    });
  }, DEBOUNCE_MS);
}

async function runSync(reason) {
  if (isRunning) {
    return;
  }

  isRunning = true;
  const runId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  try {
    await updateHeartbeat("syncing", { lastRunReason: reason, lastError: "" });
    await SyncLog.create({
      runId,
      action: "sync",
      status: "running",
      message: `Sync started by ${reason}`,
      startedAt: new Date(),
    });

    await processOutboundQueue(runId);

    const files = listFiles(VFP_DATA_DIR);
    const dbfFiles = files.filter((filePath) =>
      filePath.toLowerCase().endsWith(".dbf")
    );

    for (const filePath of files) {
      await syncFileAsset(filePath, runId);
    }

    for (const filePath of dbfFiles) {
      await importDbfFile(filePath, runId);
    }

    await SyncLog.create({
      runId,
      action: "sync",
      status: "success",
      message: `Sync finished. ${files.length} file(s), ${dbfFiles.length} DBF table(s) checked.`,
      finishedAt: new Date(),
    });
  } catch (error) {
    await updateHeartbeat("error", {
      lastRunReason: reason,
      lastError: error.message,
    });

    await SyncLog.create({
      runId,
      action: "sync",
      status: "failed",
      error: error.message,
      finishedAt: new Date(),
    });

    throw error;
  } finally {
    isRunning = false;
    await updateHeartbeat("online", { lastRunReason: reason });
  }
}

async function updateHeartbeat(status, extra = {}) {
  await WorkerHeartbeat.updateOne(
    { workerId: WORKER_ID },
    {
      $set: {
        workerId: WORKER_ID,
        status,
        dataDir: VFP_DATA_DIR,
        lastSeenAt: new Date(),
        ...extra,
      },
    },
    { upsert: true }
  );
}

async function processCommands() {
  const commands = await SyncCommand.find({ status: "queued" })
    .sort({ createdAt: 1 })
    .limit(5);

  for (const command of commands) {
    command.status = "processing";
    await command.save();

    try {
      await runSync(command.command);
      command.status = "done";
      command.processedAt = new Date();
      command.message = "Processed by local VFP sync worker.";
    } catch (error) {
      command.status = "failed";
      command.message = error.message;
    }

    await command.save();
  }
}

async function processOutboundQueue(runId) {
  const pending = await OutboundQueue.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(100);

  for (const item of pending) {
    item.status = "processing";
    item.attempts = (item.attempts || 0) + 1;
    await item.save();

    try {
      const result = await applyOutboundItem(item);

      item.status = result.status;
      item.lastError = result.message;
      await item.save();

      await SyncLog.create({
        runId,
        tableName: item.tableName,
        action: "crm_to_dbf",
        status: result.status === "applied" ? "success" : "skipped",
        skippedCount: result.status === "applied" ? 0 : 1,
        message: result.message,
      });
    } catch (error) {
      const locked = isLockError(error);

      item.status = locked ? "pending" : "failed";
      item.lastError = error.message;
      await item.save();

      await SyncLog.create({
        runId,
        tableName: item.tableName,
        action: "crm_to_dbf",
        status: locked ? "locked" : "failed",
        error: error.message,
      });
    }
  }
}

async function applyOutboundItem(item) {
  const exactName = `${item.tableName}.dbf`;
  const tableMap =
    (await TableMap.findOne({ fileName: exactName })) ||
    (await TableMap.findOne({
      fileName: new RegExp(`^${escapeRegExp(item.tableName)}\\.dbf$`, "i"),
    }));

  if (!tableMap) {
    return markOutboundConflict(
      item,
      "No DBF table mapping found. Run a rescan before applying CRM changes."
    );
  }

  const dbf = readDbf(tableMap.filePath);
  const primaryKeyFields = tableMap.primaryKeyFields || [];
  const row = dbf.rows.find(
    (candidate) => buildSourceKey(candidate, primaryKeyFields) === item.sourceKey
  );

  if (!row) {
    return markOutboundConflict(
      item,
      "Generic DBF insert is disabled. Create the row in VFP first, then update it from CRM."
    );
  }

  const currentHash = hashJson(row.data);
  if (item.baseHash && item.baseHash !== currentHash && CONFLICT_POLICY === "vfp_wins") {
    return markOutboundConflict(
      item,
      "VFP changed this record after the CRM queued its update, so VFP wins."
    );
  }

  if (item.operation === "delete") {
    markDbfRowDeleted(tableMap.filePath, dbf, row.rowNumber);
    return {
      status: "applied",
      message: `Marked ${item.tableName}/${item.sourceKey} as deleted in DBF.`,
    };
  }

  updateDbfRow(tableMap.filePath, dbf, row.rowNumber, item.payload || {});

  return {
    status: "applied",
    message: `Updated ${item.tableName}/${item.sourceKey} in DBF.`,
  };
}

async function markOutboundConflict(item, reason) {
  await Conflict.create({
    tableName: item.tableName,
    sourceKey: item.sourceKey,
    policy: CONFLICT_POLICY,
    crmPayload: item.payload,
    reason,
    status: "open",
  });

  return {
    status: "conflict",
    message: reason,
  };
}

async function importDbfFile(filePath, runId) {
  const fileName = path.basename(filePath);
  const tableName = path.basename(filePath, path.extname(filePath));
  const targetCollection = `vfp_${sanitizeCollectionName(tableName)}`;
  const startedAt = new Date();

  await SyncState.updateOne(
    { tableName },
    {
      $set: {
        tableName,
        fileName,
        filePath,
        targetCollection,
        status: "running",
        lastStartedAt: startedAt,
      },
    },
    { upsert: true }
  );

  try {
    const stats = fs.statSync(filePath);
    const dbf = readDbf(filePath);
    const primaryKeyFields = guessPrimaryKeyFields(dbf.fields);

    await TableMap.updateOne(
      { fileName },
      {
        $set: {
          fileName,
          filePath,
          targetCollection,
          primaryKeyFields,
          columns: dbf.fields,
          recordCount: dbf.recordCount,
          lastFileMtimeMs: stats.mtimeMs,
          lastDiscoveredAt: new Date(),
          enabled: true,
        },
      },
      { upsert: true }
    );

    const collection = mongoose.connection.collection(targetCollection);
    await collection.createIndex(
      { _vfpTable: 1, _vfpSourceKey: 1 },
      { unique: true }
    );

    let importedCount = 0;
    let tableHash = "";

    for (const row of dbf.rows) {
      const sourceKey = buildSourceKey(row, primaryKeyFields);
      const rowHash = hashJson(row.data);
      tableHash = hashJson(`${tableHash}:${rowHash}`);

      await collection.updateOne(
        { _vfpTable: tableName, _vfpSourceKey: sourceKey },
        {
          $set: {
            ...row.data,
            _vfpTable: tableName,
            _vfpSourceKey: sourceKey,
            _vfpRowNumber: row.rowNumber,
            _vfpRowHash: rowHash,
            _vfpFileName: fileName,
            _vfpFileMtimeMs: stats.mtimeMs,
            _vfpDeleted: row.deleted,
            _vfpSyncedAt: new Date(),
          },
        },
        { upsert: true }
      );

      importedCount += 1;
    }

    await SyncState.updateOne(
      { tableName },
      {
        $set: {
          status: "success",
          lastSyncedAt: new Date(),
          lastFileMtimeMs: stats.mtimeMs,
          lastRecordCount: dbf.recordCount,
          lastImportedCount: importedCount,
          lastSkippedCount: 0,
          lastHash: tableHash,
          lastError: "",
        },
      },
      { upsert: true }
    );

    await SyncLog.create({
      runId,
      tableName,
      fileName,
      action: "dbf_to_crm",
      status: "success",
      importedCount,
      message: `Imported ${importedCount} row(s) from ${fileName}.`,
      startedAt,
      finishedAt: new Date(),
    });
  } catch (error) {
    const locked = isLockError(error);

    await SyncState.updateOne(
      { tableName },
      {
        $set: {
          status: locked ? "locked" : "failed",
          lastError: error.message,
        },
      },
      { upsert: true }
    );

    await SyncLog.create({
      runId,
      tableName,
      fileName,
      action: "dbf_to_crm",
      status: locked ? "locked" : "failed",
      error: error.message,
      startedAt,
      finishedAt: new Date(),
    });
  }
}

async function syncFileAsset(filePath, runId) {
  const startedAt = new Date();
  const relativePath = path.relative(VFP_DATA_DIR, filePath).replace(/\\/g, "/");
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName).replace(".", "").toLowerCase();

  try {
    const stats = fs.statSync(filePath);
    const contentHash = await hashFile(filePath);
    const existing = await FileAsset.findOne({ relativePath });
    const isUnchanged =
      existing &&
      existing.contentHash === contentHash &&
      existing.size === stats.size &&
      existing.mtimeMs === stats.mtimeMs;

    if (isUnchanged) {
      existing.lastSyncedAt = new Date();
      await existing.save();
      return;
    }

    const update = {
      relativePath,
      fileName,
      extension,
      filePath,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      contentHash,
      lastSyncedAt: new Date(),
      lastError: "",
    };

    if (stats.size <= FILE_SNAPSHOT_MAX_BYTES) {
      const gridFsId = await storeGridFsSnapshot(filePath, {
        relativePath,
        fileName,
        extension,
        contentHash,
      });

      if (existing?.gridFsId) {
        await deleteGridFsSnapshot(existing.gridFsId);
      }

      update.storageStatus = "stored";
      update.gridFsId = gridFsId;
    } else {
      update.storageStatus = "too_large";
      update.gridFsId = undefined;
    }

    await FileAsset.updateOne({ relativePath }, { $set: update }, { upsert: true });
  } catch (error) {
    await FileAsset.updateOne(
      { relativePath },
      {
        $set: {
          relativePath,
          fileName,
          extension,
          filePath,
          storageStatus: "failed",
          lastError: error.message,
          lastSyncedAt: new Date(),
        },
      },
      { upsert: true }
    );

    await SyncLog.create({
      runId,
      fileName,
      action: "file_snapshot",
      status: isLockError(error) ? "locked" : "failed",
      error: error.message,
      startedAt,
      finishedAt: new Date(),
    });
  }
}

function listFiles(rootDir) {
  const files = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function storeGridFsSnapshot(filePath, metadata) {
  const bucket = getGridFsBucket();
  const uploadStream = bucket.openUploadStream(metadata.relativePath, {
    metadata,
  });

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on("error", reject)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", resolve);
  });

  return uploadStream.id;
}

async function deleteGridFsSnapshot(id) {
  const bucket = getGridFsBucket();

  try {
    await bucket.delete(id);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`[vfp-sync] Unable to delete old GridFS snapshot: ${error.message}`);
    }
  }
}

function getGridFsBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "vfp_file_snapshots",
  });
}

async function hashFile(filePath) {
  const hash = crypto.createHash("sha256");

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", resolve);
  });

  return hash.digest("hex");
}

function readDbf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields = [];

  for (let offset = 32; offset < headerLength; offset += 32) {
    if (buffer[offset] === 0x0d) {
      break;
    }

    const name = decodeText(buffer.subarray(offset, offset + 11)).replace(/\0/g, "");
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    const decimalCount = buffer[offset + 17];

    if (name) {
      const dataOffset = fields.reduce((total, field) => total + field.length, 1);
      fields.push({ name, type, length, decimalCount, dataOffset });
    }
  }

  const rows = [];
  for (let index = 0; index < recordCount; index += 1) {
    const base = headerLength + index * recordLength;
    if (base + recordLength > buffer.length) {
      break;
    }

    let cursor = base + 1;
    const data = {};

    for (const field of fields) {
      const raw = buffer.subarray(cursor, cursor + field.length);
      data[field.name] = parseFieldValue(raw, field);
      cursor += field.length;
    }

    rows.push({
      rowNumber: index + 1,
      deleted: buffer[base] === 0x2a,
      data,
    });
  }

  return { fields, rows, recordCount, headerLength, recordLength };
}

function updateDbfRow(filePath, dbf, rowNumber, payload) {
  const recordOffset = dbf.headerLength + (rowNumber - 1) * dbf.recordLength;
  const handle = fs.openSync(filePath, "r+");

  try {
    for (const field of dbf.fields) {
      if (
        !Object.prototype.hasOwnProperty.call(payload, field.name) ||
        field.name.startsWith("_vfp")
      ) {
        continue;
      }

      const encoded = encodeFieldValue(payload[field.name], field);
      fs.writeSync(handle, encoded, 0, encoded.length, recordOffset + field.dataOffset);
    }
  } finally {
    fs.closeSync(handle);
  }
}

function markDbfRowDeleted(filePath, dbf, rowNumber) {
  const recordOffset = dbf.headerLength + (rowNumber - 1) * dbf.recordLength;
  const handle = fs.openSync(filePath, "r+");

  try {
    fs.writeSync(handle, Buffer.from("*"), 0, 1, recordOffset);
  } finally {
    fs.closeSync(handle);
  }
}

function encodeFieldValue(value, field) {
  if (value === null || value === undefined) {
    return Buffer.alloc(field.length, " ");
  }

  switch (field.type) {
    case "N":
    case "F":
      return fixedText(String(value), field.length, "left");
    case "I": {
      const buffer = Buffer.alloc(field.length);
      buffer.writeInt32LE(Number(value) || 0, 0);
      return buffer;
    }
    case "Y": {
      const buffer = Buffer.alloc(field.length);
      buffer.writeBigInt64LE(BigInt(Math.round(Number(value) * 10000)), 0);
      return buffer;
    }
    case "D":
      return fixedText(String(value).replace(/-/g, "").slice(0, 8), field.length, "right");
    case "L":
      return fixedText(value ? "T" : "F", field.length, "right");
    case "M":
    case "G":
    case "P":
      return fixedText(String(value.memoPointer || value), field.length, "left");
    default:
      return fixedText(String(value), field.length, "right");
  }
}

function fixedText(value, length, align) {
  const clipped = value.slice(0, length);
  const padded =
    align === "left" ? clipped.padStart(length, " ") : clipped.padEnd(length, " ");
  return Buffer.from(padded, VFP_ENCODING);
}

function parseFieldValue(raw, field) {
  const text = decodeText(raw).trim();

  if (text === "") {
    return null;
  }

  switch (field.type) {
    case "N":
    case "F":
      return Number.isNaN(Number(text)) ? text : Number(text);
    case "I":
      return raw.length >= 4 ? raw.readInt32LE(0) : null;
    case "Y":
      return raw.length >= 8 ? Number(raw.readBigInt64LE(0)) / 10000 : null;
    case "D":
      return /^\d{8}$/.test(text)
        ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
        : text;
    case "L":
      return ["Y", "y", "T", "t"].includes(text)
        ? true
        : ["N", "n", "F", "f"].includes(text)
        ? false
        : null;
    case "M":
    case "G":
    case "P":
      return { memoPointer: text };
    default:
      return text;
  }
}

function guessPrimaryKeyFields(fields) {
  const candidates = ["ID", "CODE", "CUSTID", "ITEMID", "BILLNO", "VOUCHNO", "INVNO"];
  const names = fields.map((field) => field.name);
  const match = names.find((name) => candidates.includes(name.toUpperCase()));
  return match ? [match] : [];
}

function buildSourceKey(row, primaryKeyFields) {
  if (primaryKeyFields.length > 0) {
    const key = primaryKeyFields
      .map((field) => String(row.data[field] ?? "").trim())
      .filter(Boolean)
      .join(":");

    if (key) {
      return key;
    }
  }

  return `row:${row.rowNumber}`;
}

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sanitizeCollectionName(value) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+/, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeText(buffer) {
  return buffer.toString(VFP_ENCODING);
}

function isLockError(error) {
  return ["EBUSY", "EPERM", "EACCES"].includes(error.code);
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
