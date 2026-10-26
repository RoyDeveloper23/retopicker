import { Suspense } from "react";
import { connection } from "next/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getDashboardData } from "@/lib/dashboard/data";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh bg-slate-50 px-4 py-8 text-sm text-slate-600 sm:px-6">
          Cargando datos operativos...
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
