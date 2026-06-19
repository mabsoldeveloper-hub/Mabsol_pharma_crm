import mongoose from "mongoose";

const VfpTableMapSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      unique: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    targetCollection: {
      type: String,
      required: true,
    },
    primaryKeyFields: {
      type: [String],
      default: [],
    },
    columns: {
      type: [
        {
          name: String,
          type: String,
          length: Number,
          decimalCount: Number,
        },
      ],
      default: [],
    },
    recordCount: {
      type: Number,
      default: 0,
    },
    lastFileMtimeMs: Number,
    lastDiscoveredAt: Date,
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.VfpTableMap ||
  mongoose.model("VfpTableMap", VfpTableMapSchema);
