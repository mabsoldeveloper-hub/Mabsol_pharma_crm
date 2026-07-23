/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const mongoose = require("mongoose");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

loadEnv(path.join(PROJECT_ROOT, ".env"));

let VFP_DATA_DIR = process.env.VFP_DATA_DIR;
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
const VfpConfig = mongoose.model(
  "VfpConfig",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
  "vfpconfigs"
);

let scheduledTimer = null;
let isRunning = false;
const WORKER_ID = `${require("node:os").hostname()}-${process.pid}`;
const activeWatchers = new Map(); // path -> watcher

main().catch((error) => {
  console.error("[mabsolcrm-sync] Fatal error:", error);
  process.exitCode = 1;
});

async function main() {
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 3 });
  console.log(`[vfp-sync] Connected to MongoDB`);

  await resolveDataDirs();

  await updateHeartbeat("online");
  scheduleSync("startup");
  setInterval(() => scheduleSync("interval"), SYNC_INTERVAL_MS);
  setInterval(processCommands, 1000); // Poll commands every 1 second
  setInterval(resolveDataDirs, 30000);
  setInterval(() => updateHeartbeat(isRunning ? "syncing" : "online"), 10000);
}

function updateWatchers(configs) {
  const activePaths = new Set(configs.map(c => c.dataDir).filter(Boolean));
  
  for (const [watchedPath, watcher] of activeWatchers.entries()) {
    if (!activePaths.has(watchedPath)) {
      watcher.close();
      activeWatchers.delete(watchedPath);
      console.log(`[vfp-sync] Closed watcher for ${watchedPath}`);
    }
  }

  for (const config of configs) {
    const dataDir = config.dataDir;
    if (dataDir && fs.existsSync(dataDir) && !activeWatchers.has(dataDir)) {
      try {
        const watcher = fs.watch(dataDir, { recursive: true }, (_eventType, fileName) => {
          if (!fileName) return;
          const baseName = path.basename(fileName);
          if (!isValidTableFile(baseName)) return;
          scheduleSync(`file:${fileName} in ${dataDir}`);
        });
        activeWatchers.set(dataDir, watcher);
        console.log(`[vfp-sync] Watcher active on ${dataDir}`);
      } catch (error) {
        console.warn(`[vfp-sync] Watcher unavailable for ${dataDir}:`, error.message);
      }
    }
  }
}

async function resolveDataDirs() {
  try {
    const configs = await VfpConfig.find({ dataDir: { $exists: true, $ne: "" } });
    updateWatchers(configs);
  } catch (error) {
    console.error("[vfp-sync] Error resolving VFP data directories:", error.message);
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

async function runSync(reason, targetEmail) {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    let configs = [];
    if (targetEmail) {
      configs = await VfpConfig.find({ email: targetEmail, dataDir: { $exists: true, $ne: "" } });
    } else {
      configs = await VfpConfig.find({ dataDir: { $exists: true, $ne: "" } });
    }

    if (configs.length === 0) {
      return;
    }

    for (const config of configs) {
      const isAutoTrigger = reason === "interval" || reason === "startup" || (typeof reason === "string" && reason.startsWith("file:"));
      if (isAutoTrigger) {
        if (!config.autoSync) {
          continue;
        }
        
        // Dynamic interval checking
        const currentEmail = config.email || "global";
        try {
          const lastLog = await SyncLog.findOne({ email: currentEmail, action: "sync", status: "success" }).sort({ finishedAt: -1 });
          if (lastLog && lastLog.finishedAt) {
            const elapsedMs = Date.now() - new Date(lastLog.finishedAt).getTime();
            const intervalMins = config.autoSyncInterval || 10;
            if (elapsedMs < intervalMins * 60 * 1000) {
              continue; // Skip periodic run as interval has not elapsed yet
            }
          }
        } catch (err) {
          console.error(`[vfp-sync] Error checking last sync log for ${currentEmail}:`, err.message);
        }
      }

      const currentEmail = config.email || "global";
      const currentDataDir = config.dataDir;
      const currentEnabledFiles = config.enabledFiles || [];
      const runId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

      if (!fs.existsSync(currentDataDir)) {
        console.warn(`[vfp-sync] Directory does not exist for user ${currentEmail}: ${currentDataDir}`);
        continue;
      }

      await updateHeartbeat("syncing", { lastRunReason: reason, lastError: "" });
      await SyncLog.create({
        runId,
        email: currentEmail,
        action: "sync",
        status: "running",
        message: `Sync started by ${reason} for user ${currentEmail}`,
        startedAt: new Date(),
      });

      await processOutboundQueue(runId, currentEmail, currentDataDir);

      let files = listFiles(currentDataDir).filter((filePath) =>
        isValidTableFile(path.basename(filePath))
      );

      if (currentEnabledFiles && currentEnabledFiles.length > 0) {
        const enabledSet = new Set(currentEnabledFiles.map((f) => f.toLowerCase()));
        files = files.filter((filePath) => {
          const relativePath = path
            .relative(currentDataDir, filePath)
            .replace(/\\/g, "/")
            .toLowerCase();
          const baseNameWithoutExt = relativePath.replace(/\.[^.]+$/, "");

          if (enabledSet.has(relativePath)) {
            return true;
          }

          const matchingDbfRelative = `${baseNameWithoutExt}.dbf`;
          if (enabledSet.has(matchingDbfRelative)) {
            return true;
          }

          return false;
        });
      }

      const dbfFiles = files.filter((filePath) =>
        filePath.toLowerCase().endsWith(".dbf")
      );

      for (const filePath of files) {
        await syncFileAsset(filePath, runId, currentEmail, currentDataDir);
      }

      for (const filePath of dbfFiles) {
        await importDbfFile(filePath, runId, currentEmail, currentDataDir);
      }

      const scannedFileNames = dbfFiles.map((filePath) =>
        path.relative(currentDataDir, filePath).replace(/\\/g, "/")
      );
      const scannedTableNames = scannedFileNames.map((fName) =>
        fName.replace(/\.[^.]+$/, "")
      );
      const scannedAssetRelativePaths = files.map((filePath) =>
        path.relative(currentDataDir, filePath).replace(/\\/g, "/")
      );

      await TableMap.deleteMany({ email: currentEmail, fileName: { $nin: scannedFileNames } });
      await SyncState.deleteMany({ email: currentEmail, tableName: { $nin: scannedTableNames } });
      await FileAsset.deleteMany({ email: currentEmail, relativePath: { $nin: scannedAssetRelativePaths } });

      await SyncLog.create({
        runId,
        email: currentEmail,
        action: "sync",
        status: "success",
        message: `Sync finished. ${files.length} file(s), ${dbfFiles.length} DBF table(s) checked.`,
        finishedAt: new Date(),
      });
    }
  } catch (error) {
    await updateHeartbeat("error", {
      lastRunReason: reason,
      lastError: error.message,
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

  if (commands.length > 0) {
    console.log(`[vfp-sync] Found ${commands.length} queued command(s) to process:`, commands.map(c => c.command));
  }

  for (const command of commands) {
    console.log(`[vfp-sync] Processing command: ${command.command} (ID: ${command._id})`);
    command.status = "processing";
    await command.save();

    try {
      await runSync(command.command, command.email);
      command.status = "done";
      command.message = "Processed by local VFP sync worker.";
      console.log(`[vfp-sync] Command ${command.command} sync completed successfully.`);
    } catch (error) {
      console.error(`[vfp-sync] Command ${command.command} failed:`, error.message);
      command.status = "failed";
      command.message = error.message;
    }

    command.processedAt = new Date();
    await command.save();
  }
}

async function processOutboundQueue(runId, email, dataDir) {
  const pending = await OutboundQueue.find({ status: "pending", email })
    .sort({ createdAt: 1 })
    .limit(100);

  for (const item of pending) {
    item.status = "processing";
    item.attempts = (item.attempts || 0) + 1;
    await item.save();

    try {
      const result = await applyOutboundItem(item, email, dataDir);

      item.status = result.status;
      item.lastError = result.message;
      await item.save();

      await SyncLog.create({
        runId,
        email,
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
        email,
        tableName: item.tableName,
        action: "crm_to_dbf",
        status: locked ? "locked" : "failed",
        error: error.message,
      });
    }
  }
}

async function applyOutboundItem(item, email, dataDir) {
  const exactName = `${item.tableName}.dbf`;
  const queryTableName = item.tableName.toLowerCase();
  const tableMap =
    (await TableMap.findOne({ email, fileName: new RegExp(`(^|/)${escapeRegExp(queryTableName)}\\.dbf$`, "i") })) ||
    (await TableMap.findOne({ email, fileName: exactName }));

  if (!tableMap) {
    return markOutboundConflict(
      item,
      "No DBF table mapping found. Run a rescan before applying CRM changes.",
      email
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
      "Generic DBF insert is disabled. Create the row in VFP first, then update it from CRM.",
      email
    );
  }

  const currentHash = hashJson(row.data);
  if (item.baseHash && item.baseHash !== currentHash && CONFLICT_POLICY === "vfp_wins") {
    return markOutboundConflict(
      item,
      "VFP changed this record after the CRM queued its update, so VFP wins.",
      email
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

async function markOutboundConflict(item, reason, email) {
  await Conflict.create({
    tableName: item.tableName,
    email,
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

async function importDbfFile(filePath, runId, email, dataDir) {
  const rootFolderName = path.basename(dataDir) || "default";
  const relativePath = path.relative(dataDir, filePath).replace(/\\/g, "/");
  const fileName = relativePath;
  const tableName = relativePath.replace(/\.[^.]+$/, "");
  
  const relativeDir = path.dirname(relativePath);
  const baseName = path.basename(relativePath, path.extname(relativePath));
  
  const sanitizedTableName = sanitizeCollectionName(baseName);
  const targetCollection = `vfp_new_folder_${sanitizedTableName}`;
  const startedAt = new Date();

  await SyncState.updateOne(
    { tableName, email },
    {
      $set: {
        tableName,
        email,
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
    const primaryKeyFields = guessPrimaryKeyFields(dbf.fields, dbf.rows);

    await TableMap.updateOne(
      { fileName, email },
      {
        $set: {
          fileName,
          email,
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
    const bulkOps = [];

    for (const row of dbf.rows) {
      const sourceKey = buildSourceKey(row, primaryKeyFields);
      const rowHash = hashJson(row.data);
      tableHash = hashJson(`${tableHash}:${rowHash}`);

      bulkOps.push({
        updateOne: {
          filter: { _vfpTable: tableName, _vfpSourceKey: sourceKey },
          update: {
            $set: {
              ...row.data,
              _vfpTable: tableName,
              _vfpSourceKey: sourceKey,
              _vfpRowNumber: row.rowNumber,
              _vfpRowHash: rowHash,
              _vfpFileName: fileName,
              _vfpFileMtimeMs: stats.mtimeMs,
              _vfpDeleted: row.deleted,
              _vfpSyncRunId: runId,
              _vfpSyncedAt: new Date(),
            },
          },
          upsert: true,
        },
      });

      if (bulkOps.length >= 1000) {
        await collection.bulkWrite(bulkOps, { ordered: false });
        importedCount += bulkOps.length;
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps, { ordered: false });
      importedCount += bulkOps.length;
    }

    // Clean up any records in this collection that were not updated in this sync run (e.g., packed/deleted rows)
    await collection.deleteMany({ _vfpTable: tableName, _vfpSyncRunId: { $ne: runId } });

    const syncDateLabel = getSyncDateLabel(new Date());
    await SyncState.updateOne(
      { tableName, email },
      {
        $set: {
          status: "success",
          lastSyncedAt: new Date(),
          lastSyncedDate: syncDateLabel,
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
      email,
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
      { tableName, email },
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
      email,
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

async function syncFileAsset(filePath, runId, email, dataDir) {
  const startedAt = new Date();
  const relativePath = path.relative(dataDir, filePath).replace(/\\/g, "/");
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName).replace(".", "").toLowerCase();

  try {
    const stats = fs.statSync(filePath);
    const contentHash = await hashFile(filePath);
    const existing = await FileAsset.findOne({ relativePath, email });
    const isUnchanged =
      existing &&
      existing.contentHash === contentHash &&
      existing.size === stats.size &&
      existing.mtimeMs === stats.mtimeMs;

    if (isUnchanged) {
      const now = new Date();
      existing.lastSyncedAt = now;
      existing.lastSyncedDate = getSyncDateLabel(now);
      await existing.save();
      return;
    }

    const syncDateLabel = getSyncDateLabel(new Date());
    const update = {
      relativePath,
      email,
      fileName,
      extension,
      filePath,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      contentHash,
      lastSyncedAt: new Date(),
      lastSyncedDate: syncDateLabel,
      lastError: "",
    };

    if (stats.size <= FILE_SNAPSHOT_MAX_BYTES) {
      const gridFsId = await storeGridFsSnapshot(filePath, {
        relativePath,
        email,
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

    await FileAsset.updateOne({ relativePath, email }, { $set: update }, { upsert: true });
  } catch (error) {
    const now = new Date();
    await FileAsset.updateOne(
      { relativePath, email },
      {
        $set: {
          relativePath,
          email,
          fileName,
          extension,
          filePath,
          storageStatus: "failed",
          lastError: error.message,
          lastSyncedAt: now,
          lastSyncedDate: getSyncDateLabel(now),
        },
      },
      { upsert: true }
    );

    await SyncLog.create({
      runId,
      email,
      fileName,
      action: "file_snapshot",
      status: isLockError(error) ? "locked" : "failed",
      error: error.message,
      startedAt,
      finishedAt: new Date(),
    });
  }
}

function isValidDirectory(dirName) {
  const name = dirName.toLowerCase();
  if (dirName.startsWith("_") || dirName.startsWith("~")) {
    return false;
  }
  if (name.includes("temp") || name.includes("tmp") || name.includes("backup")) {
    return false;
  }
  return true;
}

function listFiles(rootDir) {
  const files = [];

  function traverse(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (isValidDirectory(entry.name)) {
          traverse(entryPath);
        }
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  traverse(rootDir);
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

    const name = decodeText(buffer.subarray(offset, offset + 11)).replace(/\0/g, "").trim();
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    const decimalCount = buffer[offset + 17];

    if (name) {
      const dataOffset = fields.reduce((total, field) => total + field.length, 1);
      fields.push({ name, type, length, decimalCount, dataOffset });
    }
  }

  // Detect matching FPT file
  const ext = path.extname(filePath);
  const baseName = filePath.slice(0, -ext.length);
  const fptPath = baseName + (ext === ext.toUpperCase() ? ".FPT" : ".fpt");
  const hasFpt = fs.existsSync(fptPath);

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
      let val = parseFieldValue(raw, field);

      if (hasFpt && (field.type === "M" || field.type === "G" || field.type === "P")) {
        const blockNumber = parseMemoPointer(raw);
        if (blockNumber > 0) {
          val = readFptMemo(fptPath, blockNumber, field.type, VFP_ENCODING);
        } else {
          val = "";
        }
      }

      data[field.name] = val;
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

function parseMemoPointer(raw) {
  if (raw.length === 4) {
    return raw.readUInt32LE(0);
  }
  const text = raw.toString("latin1").trim();
  const num = Number(text);
  return isNaN(num) ? 0 : num;
}

function readFptMemo(fptPath, blockNum, fieldType, encoding) {
  try {
    const fd = fs.openSync(fptPath, "r");
    try {
      const headerBuffer = Buffer.alloc(8);
      fs.readSync(fd, headerBuffer, 0, 8, 0);
      const blockSize = headerBuffer.readUInt16BE(6) || 64;

      const blockOffset = blockNum * blockSize;
      const blockHeader = Buffer.alloc(8);
      fs.readSync(fd, blockHeader, 0, 8, blockOffset);

      const signature = blockHeader.readUInt32BE(0);
      const length = blockHeader.readUInt32BE(4);

      if (length <= 0 || length > 50 * 1024 * 1024) { // safety limit 50MB
        return "";
      }

      const memoBuffer = Buffer.alloc(length);
      fs.readSync(fd, memoBuffer, 0, length, blockOffset + 8);

      if (signature === 1 && fieldType === "M") {
        // Text memo
        return memoBuffer.toString(encoding).trim();
      } else {
        // Binary/Picture/General memo
        return memoBuffer.toString("base64");
      }
    } finally {
      fs.closeSync(fd);
    }
  } catch (error) {
    console.warn(`[vfp-sync] Error reading memo block ${blockNum} from ${fptPath}:`, error.message);
    return "";
  }
}

function isValidTableFile(fileName) {
  const name = fileName.toLowerCase();
  if (fileName.startsWith("_") || fileName.startsWith("~")) {
    return false;
  }
  if (name.includes("temp") || name.includes("tmp") || name.includes("backup")) {
    return false;
  }
  return true;
}

function guessPrimaryKeyFields(fields, rows) {
  const candidates = ["ID", "CUSTID", "ITEMID"];
  const names = fields.map((field) => field.name);
  for (const cand of candidates) {
    const match = names.find((name) => name.toUpperCase() === cand);
    if (match) {
      const values = new Set();
      let unique = true;
      for (const row of rows) {
        const val = row.data[match];
        if (val === undefined || val === null || values.has(val)) {
          unique = false;
          break;
        }
        values.add(val);
      }
      if (unique && rows.length > 0) {
        return [match];
      }
    }
  }
  return [];
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
  const base = value.split('_')[0];
  return base.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+/, "");
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

function getSyncDateLabel(dateInput = new Date()) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Unknown date";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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
