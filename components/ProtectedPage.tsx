"use client";

import { ReactNode } from "react";
import { usePermission } from "@/context/PermissionContext";

export default function ProtectedPage({

  permission,

  children,

}:{

  permission:string;

  children:ReactNode;

}){

  const {
    loading,
    can,
  } = usePermission();

  if (loading) {
    return (
      <div className="text-center mt-5">
        Loading...
      </div>
    );
  }

  if (!can(permission)) {

    return (

      <div className="card shadow">

        <div className="card-body text-center p-5">

          <h1 className="text-danger">
            403
          </h1>

          <h3>
            Access Denied
          </h3>

          <p>
            You don't have permission to access this page.
          </p>

        </div>

      </div>

    );

  }

  return <>{children}</>;

}