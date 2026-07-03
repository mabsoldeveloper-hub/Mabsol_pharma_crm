// import mongoose, { Schema, Document } from "mongoose";

// export interface IRole extends Document {
//   tenantId: mongoose.Types.ObjectId;
//   roleName: string;
//   permissions: string[];
//   status: string;
// }

// const RoleSchema = new Schema(
//   {
//     tenantId: {
//       type: Schema.Types.ObjectId,
//       ref: "Tenant",
//       required: true,
//     },

//     roleName: {
//       type: String,
//       required: true,
//     },

//     permissions: {
//       type: [String],
//       default: [],
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

// export default mongoose.models.Role ||
//   mongoose.model<IRole>("Role", RoleSchema);

import mongoose, {
  Schema,
  Document,
} from "mongoose";

export interface IRole
  extends Document {

  tenantId: string;

  roleName: string;

  description: string;

  status: string;

}

const RoleSchema =
new Schema(
{
  tenantId:{
    type:String,
    required:true,
  },

  roleName:{
    type:String,
    required:true,
    unique:true,
  },

  description:{
    type:String,
    default:"",
  },

  status:{
    type:String,
    default:"Active",
  },
},
{
  timestamps:true,
}
);

export default
mongoose.models.Role ||
mongoose.model<IRole>(
"Role",
RoleSchema
);


