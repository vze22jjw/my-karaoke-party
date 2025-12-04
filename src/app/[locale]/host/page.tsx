import { cookies } from "next/headers";
import { AdminLogin } from "~/components/admin-login";
import { api } from "~/trpc/server";
import { HostDashboardClient } from "./host-dashboard-client";

export const metadata = {
  title: "Host Dashboard - My Karaoke Party",
};

export default async function HostDashboardPage({
  params: { locale }
}: {
  params: { locale: string };
}) {
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get("admin_token_verified")?.value === "true";

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const parties = await api.party.getAll();

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient p-4 sm:p-8">
      <HostDashboardClient parties={parties} locale={locale} />
    </main>
  );
}
