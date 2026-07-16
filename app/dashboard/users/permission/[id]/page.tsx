"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

export default function UserPermissionPage() {

  const { id } = useParams();

  const [permissions, setPermissions] =
    useState<any[]>([]);

  const [checked, setChecked] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {

    loadPermissions();

    loadUserPermissions();

  }, []);

  // -------------------------
  // Load All Permissions
  // -------------------------

  const loadPermissions = async () => {

    const res =
      await fetch("/api/permissions");

    const data =
      await res.json();

    setPermissions(data);

  };

  // -------------------------
  // Load User Permissions
  // -------------------------

  const loadUserPermissions = async () => {

    const res =
      await fetch(
        `/api/user-permissions/${id}`
      );

    const data =
      await res.json();

    const arr = data
      .map((x: any) => x.permissionId)
      .filter(Boolean);

    setChecked(arr);

  };

  // -------------------------
// Checkbox
// -------------------------

const togglePermission =
(permissionId:string)=>{

if(
checked.includes(permissionId)
){

setChecked(

checked.filter(
x=>x!==permissionId
)

);

}else{

setChecked([
...checked,
permissionId,
]);

}

};

// -------------------------
// Save
// -------------------------

const savePermissions =
async()=>{

setLoading(true);

const permissionsData =
checked.map(
(pid)=>({

userId:id,

permissionId:pid,

allow:true,

})
);

await fetch(
"/api/user-permissions",
{

method:"POST",

headers:{
"Content-Type":
"application/json",
},

body:JSON.stringify({

userId:id,

permissions:
permissionsData,

}),

}

);

alert(
"User Permissions Saved Successfully"
);

setLoading(false);

};

// -------------------------
// Group Module
// -------------------------

const grouped =
permissions.reduce(
(acc:any,item:any)=>{

if(
!acc[item.moduleName]
){

acc[item.moduleName]=[];

}

acc[item.moduleName]
.push(item);

return acc;

},{}
);

return (

    <div className="card shadow border-0">
    
    <div className="card-body">
    
    <h3>
    
    User Permission
    
    </h3>
    
    <hr/>
    
    {
    
    Object.keys(grouped).map(
    
    (module)=>(
    
    <div
    className="card mb-4"
    key={module}
    >
    
    <div
    className="card-header bg-primary text-white fw-bold"
    >
    
    {module}
    
    </div>
    
    <div className="card-body">
    
    <div className="row">
    
    {
    
    grouped[module].map(
    
    (permission:any)=>(
    
    <div
    className="col-md-4 mb-3"
    key={permission._id}
    >
    
    <div className="form-check">
    
    <input
    
    type="checkbox"
    
    className="form-check-input"
    
    checked={
    checked.includes(
    permission._id
    )
    }
    
    onChange={()=>{
    
    togglePermission(
    permission._id
    )
    
    }}
    
     />
    
    <label
    className="form-check-label"
    >
    
    {permission.permissionName}
    
    </label>
    
    </div>
    
    </div>
    
    )
    
    )
    
    }
    
    </div>
    
    </div>
    
    </div>
    
    )
    
    )
    
    }
    
    <button
    
    className="btn btn-success"
    
    disabled={loading}
    
    onClick={savePermissions}
    
    >
    
    {
    
    loading
    
    ?
    
    "Saving..."
    
    :
    
    "Save Permissions"
    
    }
    
    </button>
    
    </div>
    
    </div>
    
    );
    
    }