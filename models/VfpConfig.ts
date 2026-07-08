import mongoose from "mongoose";

const VfpConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "vfp_sync_config",
    },
    dataDir: {
      type: String,
      required: true,
    },
    sourceDir: {
      type: String,
      required: false,
    },
    enabledFiles: {
      type: [String],
      required: false,
      default: [],
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
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.VfpConfig) {
  delete mongoose.models.VfpConfig;
}
export default mongoose.model("VfpConfig", VfpConfigSchema, "vfpconfigs");
