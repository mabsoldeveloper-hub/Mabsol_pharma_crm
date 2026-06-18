import mongoose from "mongoose";

const UserCompanySchema =
  new mongoose.Schema({

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

  });

export default
mongoose.models.UserCompany ||
mongoose.model(
  "UserCompany",
  UserCompanySchema
);