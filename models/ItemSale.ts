import mongoose, { Schema, models, model } from "mongoose";

const ItemSaleSchema = new Schema(
  {},
  {
    strict: false,
    collection: "vfp_new_folder_support", // ya subdis
  }
);

export default models.ItemSale ||
  model("ItemSale", ItemSaleSchema);