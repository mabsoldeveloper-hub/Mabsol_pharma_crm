"use client";

import { ReactNode } from "react";
import { usePermission } from "@/context/PermissionContext";

export default function PermissionGate({

  permission,

  children,

}:{

  permission:string;

  children:ReactNode;

}){

const{

loading,

can,

}=usePermission();

if(loading){

return null;

}

if(!can(permission)){

return null;

}

return <>{children}</>;

}