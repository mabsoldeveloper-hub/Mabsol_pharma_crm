"use client";

import { ReactNode } from "react";
import PermissionGate from "./PermissionGate";

export default function PermissionButton({

  permission,

  children,

}:{

  permission:string;

  children:ReactNode;

}){

  return (

    <PermissionGate
      permission={permission}
    >

      {children}

    </PermissionGate>

  );

}


{/* <PermissionButton
permission="users.create"
>

<button
className="btn btn-primary"
>

Create User

</button>

</PermissionButton> */}

{/* <PermissionButton
permission="users.edit"
>

<button
className="btn btn-warning"
>

Edit

</button>

</PermissionButton>


<PermissionButton
permission="users.delete"
>

<button
className="btn btn-danger"
>

Delete

</button>

</PermissionButton>


<PermissionButton
permission="users.export"
>

<button>

Export

</button>

</PermissionButton>

<PermissionButton
permission="users.print"
>

<button>

Print

</button>

</PermissionButton> */}