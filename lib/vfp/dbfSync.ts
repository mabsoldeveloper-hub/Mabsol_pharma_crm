import fs from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpTableMap from "@/models/VfpTableMap";
import VfpSyncState from "@/models/VfpSyncState";
import VfpSyncLog from "@/models/VfpSyncLog";

const VFP_ENCODING = process.env.VFP_ENCODING || "latin1";

export async function performDirectServerSync(userEmail: string) {
  await dbConnect();

  const email = userEmail || "global";
  const config =
    (await VfpConfig.findOne({ email }).lean()) ||
    (await VfpConfig.findOne({ key: "vfp_sync_config" }).lean());

  if (!config || !(config as any).dataDir) {
    throw new Error("No database directory configured. Please select a folder in Sync Settings.");
  }

  const dataDir = (config as any).dataDir;
  const enabledFiles: string[] = (config as any).enabledFiles || [];

  if (!fs.existsSync(dataDir)) {
    throw new Error(`Configured directory does not exist on server: ${dataDir}`);
  }

  const runId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const startedAt = new Date();

  await VfpSyncLog.create({
    runId,
    email,
    action: "sync",
    status: "running",
    message: `Direct server DBF sync started for user ${email}`,
    startedAt,
  });

  let files = listFiles(dataDir).filter((filePath) =>
    isValidTableFile(path.basename(filePath))
  );

  if (enabledFiles && enabledFiles.length > 0) {
    const enabledSet = new Set(enabledFiles.map((f) => f.toLowerCase()));
    files = files.filter((filePath) => {
      const relativePath = path
        .relative(dataDir, filePath)
        .replace(/\\/g, "/")
        .toLowerCase();
      const baseNameWithoutExt = relativePath.replace(/\.[^.]+$/, "");

      if (enabledSet.has(relativePath)) return true;
      if (enabledSet.has(`${baseNameWithoutExt}.dbf`)) return true;
      return false;
    });
  }

  const dbfFiles = files.filter((filePath) =>
    filePath.toLowerCase().endsWith(".dbf")
  );

  let totalImportedTables = 0;
  let totalImportedRows = 0;

  for (const filePath of dbfFiles) {
    const importedRows = await importSingleDbfFile(filePath, runId, email, dataDir);
    totalImportedRows += importedRows;
    totalImportedTables++;
  }

  const scannedFileNames = dbfFiles.map((filePath) =>
    path.relative(dataDir, filePath).replace(/\\/g, "/")
  );
  const scannedTableNames = scannedFileNames.map((fName) =>
    fName.replace(/\.[^.]+$/, "")
  );

  await VfpTableMap.deleteMany({ email, fileName: { $nin: scannedFileNames } });
  await VfpSyncState.deleteMany({ email, tableName: { $nin: scannedTableNames } });

  await VfpSyncLog.create({
    runId,
    email,
    action: "sync",
    status: "success",
    message: `Direct server sync completed successfully. ${totalImportedTables} DBF table(s), ${totalImportedRows} row(s) synced.`,
    finishedAt: new Date(),
  });

  return {
    success: true,
    runId,
    importedTables: totalImportedTables,
    importedRows: totalImportedRows,
  };
}

async function importSingleDbfFile(
  filePath: string,
  runId: string,
  email: string,
  dataDir: string
) {
  const relativePath = path.relative(dataDir, filePath).replace(/\\/g, "/");
  const fileName = relativePath;
  const tableName = relativePath.replace(/\.[^.]+$/, "");
  const baseName = path.basename(relativePath, path.extname(relativePath));
  const sanitizedTableName = sanitizeCollectionName(baseName);
  const targetCollection = `vfp_new_folder_${sanitizedTableName}`;
  const startedAt = new Date();

  await VfpSyncState.updateOne(
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

    await VfpTableMap.updateOne(
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
    const bulkOps: any[] = [];

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

    await collection.deleteMany({ _vfpTable: tableName, _vfpSyncRunId: { $ne: runId } });

    const syncDateLabel = getSyncDateLabel(new Date());
    await VfpSyncState.updateOne(
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

    await VfpSyncLog.create({
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

    return importedCount;
  } catch (error: any) {
    await VfpSyncState.updateOne(
      { tableName, email },
      {
        $set: {
          status: "failed",
          lastError: error.message,
        },
      },
      { upsert: true }
    );

    await VfpSyncLog.create({
      runId,
      email,
      tableName,
      fileName,
      action: "dbf_to_crm",
      status: "failed",
      error: error.message,
      startedAt,
      finishedAt: new Date(),
    });

    return 0;
  }
}

function listFiles(rootDir: string): string[] {
  const files: string[] = [];
  function traverse(dir: string) {
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

function isValidDirectory(dirName: string) {
  const name = dirName.toLowerCase();
  if (dirName.startsWith("_") || dirName.startsWith("~")) return false;
  if (name.includes("temp") || name.includes("tmp") || name.includes("backup")) return false;
  return true;
}

function isValidTableFile(fileName: string) {
  const name = fileName.toLowerCase();
  if (fileName.startsWith("_") || fileName.startsWith("~")) return false;
  if (name.includes("temp") || name.includes("tmp") || name.includes("backup")) return false;
  return true;
}

function readDbf(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields: any[] = [];

  for (let offset = 32; offset < headerLength; offset += 32) {
    if (buffer[offset] === 0x0d) break;

    const name = decodeText(buffer.subarray(offset, offset + 11)).replace(/\0/g, "").trim();
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    const decimalCount = buffer[offset + 17];

    if (name) {
      const dataOffset = fields.reduce((total, field) => total + field.length, 1);
      fields.push({ name, type, length, decimalCount, dataOffset });
    }
  }

  const ext = path.extname(filePath);
  const baseName = filePath.slice(0, -ext.length);
  const fptPath = baseName + (ext === ext.toUpperCase() ? ".FPT" : ".fpt");
  const hasFpt = fs.existsSync(fptPath);

  const rows: any[] = [];
  for (let index = 0; index < recordCount; index += 1) {
    const base = headerLength + index * recordLength;
    if (base + recordLength > buffer.length) break;

    let cursor = base + 1;
    const data: Record<string, any> = {};

    for (const field of fields) {
      const raw = buffer.subarray(cursor, cursor + field.length);
      let val = parseFieldValue(raw, field);

      if (hasFpt && (field.type === "M" || field.type === "G" || field.type === "P")) {
        const blockNumber = parseMemoPointer(raw);
        if (blockNumber > 0) {
          val = readFptMemo(fptPath, blockNumber, field.type);
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

function parseFieldValue(raw: Buffer, field: any) {
  const text = decodeText(raw).trim();
  if (text === "") return null;

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

function parseMemoPointer(raw: Buffer) {
  if (raw.length === 4) return raw.readUInt32LE(0);
  const text = raw.toString("latin1").trim();
  const num = Number(text);
  return isNaN(num) ? 0 : num;
}

function readFptMemo(fptPath: string, blockNum: number, fieldType: string) {
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

      if (length <= 0 || length > 50 * 1024 * 1024) return "";

      const memoBuffer = Buffer.alloc(length);
      fs.readSync(fd, memoBuffer, 0, length, blockOffset + 8);

      if (signature === 1 && fieldType === "M") {
        return memoBuffer.toString(VFP_ENCODING as BufferEncoding).trim();
      } else {
        return memoBuffer.toString("base64");
      }
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return "";
  }
}

function guessPrimaryKeyFields(fields: any[], rows: any[]) {
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
      if (unique && rows.length > 0) return [match];
    }
  }
  return [];
}

function buildSourceKey(row: any, primaryKeyFields: string[]) {
  if (primaryKeyFields.length > 0) {
    const key = primaryKeyFields
      .map((field) => String(row.data[field] ?? "").trim())
      .filter(Boolean)
      .join(":");
    if (key) return key;
  }
  return `row:${row.rowNumber}`;
}

function hashJson(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sanitizeCollectionName(value: string) {
  const base = value.split("_")[0];
  return base.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+/, "");
}

function decodeText(buffer: Buffer) {
  return buffer.toString(VFP_ENCODING as BufferEncoding);
}

function getSyncDateLabel(dateInput = new Date()) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Unknown date";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
