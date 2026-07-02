import mongoose,{
    Schema,
    Document
    } from "mongoose";
    
    export interface IRolePermission
    extends Document{
    
    roleId:string;
    
    permissionId:string;
    
    allow:boolean;
    
    }
    
    const RolePermissionSchema=
    new Schema({
    
    roleId:{
    type:Schema.Types.ObjectId,
    ref:"Role",
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
    });
    
    export default
    mongoose.models.RolePermission ||
    mongoose.model<IRolePermission>(
    "RolePermission",
    RolePermissionSchema
    );