import { Suspense } from "react";
import { AdminNav } from "../../components/admin-nav";

// The admin console has its own header: no customer header, side menu or cart here.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="h-20 bg-charcoal-900" />}>
        <AdminNav />
      </Suspense>
      {children}
    </div>
  );
}