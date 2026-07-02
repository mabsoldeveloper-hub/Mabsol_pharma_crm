import mongoose, {
  Schema,
  Document,
} from "mongoose";

export interface IPermission
  extends Document {

  moduleName: string;

  permissionName: string;

  permissionKey: string;

  status: string;
}

const PermissionSchema =
new Schema(
{

  moduleName: {
    type: String,
    required: true,
  },

  permissionName: {
    type: String,
    required: true,
  },

  permissionKey: {
    type: String,
    required: true,
    unique: true,
  },

  status: {
    type: String,
    default: "Active",
  },

},
{
  timestamps:true,
}
);

export default
mongoose.models.Permission ||

mongoose.model<IPermission>(
"Permission",
PermissionSchema
);