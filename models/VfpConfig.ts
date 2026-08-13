import mongoose from "mongoose";

const VfpConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "vfp_sync_config",
    },
    email: {
      type: String,
      required: false,
    },
    dataDir: {
      type: String,
      required: false,
    },
    sourceDir: {
      type: String,
      required: false,
    },
    consoleSyncDir: {
      type: String,
      required: false,
      default: "",
    },
    enabledFiles: {
      type: [String],
      required: false,
      default: [],
    },
    autoSync: {
      type: Boolean,
      required: false,
      default: false,
    },
    autoSyncInterval: {
      type: Number,
      required: false,
      default: 10,
    },
    useVfpEngine: {
      type: Boolean,
      required: false,
      default: false,
    },
    vfpExePath: {
      type: String,
      required: false,
      default: "",
    },
    prgPath: {
      type: String,
      required: false,
      default: "",
    },
    userName: {
      type: String,
      required: false,
      default: "",
    },
    companyName: {
      type: String,
      required: false,
      default: "",
    },
    license: {
      type: String,
      required: false,
      default: "",
    },
    startupCommand: {
      type: String,
      required: false,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.VfpConfig || mongoose.model("VfpConfig", VfpConfigSchema, "vfpconfigs");
