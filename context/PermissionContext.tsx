"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

const PermissionContext =
createContext<any>(null);

export function PermissionProvider({
  children,
}:any){

const [permissions,setPermissions]=
useState<string[]>([]);

const [loading,setLoading]=
useState(true);

const loadStarted = useRef(false);

useEffect(()=>{

if (loadStarted.current) return;
loadStarted.current = true;
loadPermissions();

},[]);

const loadPermissions=
async()=>{

try{

const res=
await fetch(
"/api/auth/permissions"
);

const data=
await res.json();

if(data.success){

setPermissions(
data.permissions
);

}

}catch(error){

console.log(error);

}

setLoading(false);

};

const can = (key: string) => {

    if (loading)
      return false;
  
    return permissions.includes(key);
  
  };
// const can=(key:string)=>{

// return permissions.includes(
// key
// );

// };

return(

<PermissionContext.Provider
value={{

permissions,

loading,

reload:loadPermissions,

can,

}}
>

{children}

</PermissionContext.Provider>

);

}

export function usePermission(){

return useContext(
PermissionContext
);

}