"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const UserContext =
createContext<any>(null);

export function UserProvider({
  children,
}:any){

const [user,setUser]=
useState(null);

const [loading,setLoading]=
useState(true);

useEffect(()=>{

loadUser();

},[]);

const loadUser=
async()=>{

const res=
await fetch(
"/api/auth/me"
);

const data=
await res.json();

if(data.success){

setUser(data.user);

}

setLoading(false);

};

return(

<UserContext.Provider
value={{
user,
loading,
reload:loadUser,
}}
>

{children}

</UserContext.Provider>

);

}

export function useUser(){

return useContext(
UserContext
);

}