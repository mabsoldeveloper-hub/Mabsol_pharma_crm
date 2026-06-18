import mongoose from "mongoose";

const UserSchema =
  new mongoose.Schema(
    {
      tenantId: {
        type: String,
        default: "TENANT001",
      },

      name: {
        type: String,
        required: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
      },

      password: {
        type: String,
        required: true,
      },

      role: {
        type: String,
        default: "Employee",
      },

      status: {
        type: String,
        default: "Active",
      },

      // Profile Fields

      mobile: {
        type: String,
        default: "",
      },

      profilePhoto: {
        type: String,
        default: "",
      },

      designation: {
        type: String,
        default: "",
      },

      department: {
        type: String,
        default: "",
      },

      gender: {
        type: String,
        default: "",
      },

      dob: {
        type: Date,
      },

      employeeCode: {
        type: String,
        default: "",
      },
      
      joiningDate: {
        type: Date,
      },

      address: {
        type: String,
        default: "",
      },

      city: {
        type: String,
        default: "",
      },

      state: {
        type: String,
        default: "",
      },

      country: {
        type: String,
        default: "",
      },

      pincode: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

export default
  mongoose.models.User ||
  mongoose.model(
    "User",
    UserSchema
  );