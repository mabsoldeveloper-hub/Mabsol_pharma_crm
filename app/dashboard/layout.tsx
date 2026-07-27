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
import { FinancialYearProvider } from "@/context/FinancialYearContext";
import DashboardLayout from "@/components/DashboardLayout";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <PermissionProvider>
        <FinancialYearProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </FinancialYearProvider>
      </PermissionProvider>
    </UserProvider>
  );
}