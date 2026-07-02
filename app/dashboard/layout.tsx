// import DashboardLayout from "@/components/DashboardLayout";

// export default function DashboardRootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <DashboardLayout>
//       {children}
//     </DashboardLayout>
//   );
// }

import { UserProvider } from "@/context/UserContext";
import { PermissionProvider } from "@/context/PermissionContext";
import DashboardLayout from "@/components/DashboardLayout";

export default function DashboardRootLayout({
  children,
}:{
  children:React.ReactNode;
}){

return(

<UserProvider>

<PermissionProvider>

<DashboardLayout>

{children}

</DashboardLayout>

</PermissionProvider>

</UserProvider>

);

}