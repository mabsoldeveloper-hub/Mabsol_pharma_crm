// import mongoose, { Schema, Document } from "mongoose";

// export interface IUser extends Document {
//   tenantId: mongoose.Types.ObjectId;
//   name: string;
//   email: string;
//   password: string;
//   role: string;
//   status: string;
// }

// const UserSchema = new Schema(
//   {
//     tenantId: {
//       type: Schema.Types.ObjectId,
//       ref: "Tenant",
//       required: true,
//     },

//     name: {
//       type: String,
//       required: true,
//     },

//     email: {
//       type: String,
//       required: true,
//       unique: true,
//     },

//     password: {
//       type: String,
//       required: true,
//     },

//     role: {
//       type: String,
//       default: "CompanyAdmin",
//     },

//     status: {
//       type: String,
//       default: "Active",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// export default mongoose.models.User ||
//   mongoose.model<IUser>("User", UserSchema);

import mongoose from "mongoose";

const UserSchema =
  new mongoose.Schema(
    {
      // tenantId: {
      //   type: String,
      // },
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

 