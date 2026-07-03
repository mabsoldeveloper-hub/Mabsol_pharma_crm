import mongoose, {
    Schema,
    Document,
  } from "mongoose";
  
  export interface IUserPermission
    extends Document {
  
    userId:
      mongoose.Types.ObjectId;
  
    permissionId:
      mongoose.Types.ObjectId;
  
    allow: boolean;
  }
  
  const UserPermissionSchema =
  new Schema(
  {
    userId:{
      type:Schema.Types.ObjectId,
      ref:"User",
      required:true,
    },
  
    permissionId:{
      type:Schema.Types.ObjectId,
      ref:"Permission",
      required:true,
    },
  
    allow:{
      type:Boolean,
      default:true,
    },
  
  },
  {
    timestamps:true,
  }
  );
  
  export default
  mongoose.models.UserPermission ||
  
  mongoose.model<IUserPermission>(
  "UserPermission",
  UserPermissionSchema
  );