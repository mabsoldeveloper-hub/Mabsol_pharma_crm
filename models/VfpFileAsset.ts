import mongoose from "mongoose";

const VfpFileAssetSchema = new mongoose.Schema(
  {
    relativePath: {
      type: String,
      required: true,
      unique: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      default: "",
      index: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    mtimeMs: Number,
    contentHash: String,
    storageStatus: {
      type: String,
      enum: ["metadata_only", "stored", "too_large", "failed"],
      default: "metadata_only",
    },
    gridFsId: mongoose.Schema.Types.ObjectId,
    lastSyncedAt: Date,
    lastError: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.VfpFileAsset ||
  mongoose.model("VfpFileAsset", VfpFileAssetSchema);
