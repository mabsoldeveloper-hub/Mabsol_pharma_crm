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
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.VfpConfig) {
  delete mongoose.models.VfpConfig;
}
export default mongoose.model("VfpConfig", VfpConfigSchema, "vfpconfigs");
