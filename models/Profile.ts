import mongoose from "mongoose";

const ProfileSchema =
  new mongoose.Schema(
    {
      userId: String,

      name: String,

      email: String,

      image: String,
    },
    {
      timestamps: true,
    }
  );

export default
  mongoose.models.Profile ||
  mongoose.model(
    "Profile",
    ProfileSchema
  );