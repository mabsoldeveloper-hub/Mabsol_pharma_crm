import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { performDirectServerSync } from "@/lib/vfp/dbfSync";
import VfpConfig from "@/models/VfpConfig";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided in upload request" }, { status: 400 });
    }

    const sanitizedEmail = user.email.replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadDir = path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadedFileNames: string[] = [];

    for (const file of files) {
      if (typeof file === "object" && file.name) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filePath = path.join(uploadDir, path.basename(file.name));
        fs.writeFileSync(filePath, buffer);
        uploadedFileNames.push(path.basename(file.name));
      }
    }

    // Get all DBF files present in the upload directory (preserving previous uploads)
    const allUploadDbfFiles = fs.readdirSync(uploadDir).filter((f) => f.toLowerCase().endsWith(".dbf"));

    // Merge existing enabled files with all uploaded DBF files
    const existingConfig = await VfpConfig.findOne({ email: user.email }).lean() as any;
    const currentEnabled: string[] = existingConfig?.enabledFiles || [];
    const mergedEnabledFiles = Array.from(new Set([...currentEnabled, ...allUploadDbfFiles]));

    // Save uploaded folder location and merged enabled files in VfpConfig
    await VfpConfig.updateOne(
      { email: user.email },
      {
        $set: {
          email: user.email,
          consoleSyncDir: uploadDir,
          dataDir: uploadDir,
          enabledFiles: mergedEnabledFiles,
        },
      },
      { upsert: true }
    );
    await VfpConfig.updateOne(
      { key: "vfp_sync_config" },
      {
        $set: {
          consoleSyncDir: uploadDir,
          dataDir: uploadDir,
          enabledFiles: mergedEnabledFiles,
        },
      },
      { upsert: true }
    );

    // Run direct DBF sync on server using newly uploaded files
    const syncResult = await performDirectServerSync(user.email);

    return NextResponse.json({
      success: true,
      message: `Uploaded ${uploadedFileNames.length} file(s) to server & synced successfully! Synced ${syncResult.importedTables} table(s), ${syncResult.importedRows} row(s).`,
      result: syncResult,
      uploadedFileNames,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process DBF upload" },
      { status: 500 }
    );
  }
}
