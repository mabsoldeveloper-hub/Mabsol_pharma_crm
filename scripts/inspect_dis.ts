import fs from "fs";
import path from "path";

function readDbf(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields: any[] = [];

  for (let offset = 32; offset < headerLength; offset += 32) {
    if (buffer[offset] === 0x0d) break;

    const name = buffer.subarray(offset, offset + 11).toString("latin1").replace(/\0/g, "").trim();
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    const decimalCount = buffer[offset + 17];

    if (name) {
      const dataOffset = fields.reduce((total, field) => total + field.length, 1);
      fields.push({ name, type, length, decimalCount, dataOffset });
    }
  }

  console.log(`Header for ${path.basename(filePath)}: recordCount=${recordCount}, headerLength=${headerLength}, recordLength=${recordLength}, fieldsCount=${fields.length}`);
  console.log("Fields:", fields.map(f => `${f.name}:${f.type}(${f.length})`).join(", "));
  return { recordCount, fields };
}

try {
  const filePath = "C:\\Users\\hp\\Downloads\\MANCHANDA\\MANCHANDA\\DIS_F17.DBF";
  readDbf(filePath);
} catch (e: any) {
  console.error("Error reading DIS_F17.DBF:", e);
}
