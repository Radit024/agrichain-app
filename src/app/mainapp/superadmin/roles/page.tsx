import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listAllOrganizations, listAllUsersWithRoles } from "@/server/queries/user-roles";
import { RoleManagementClient } from "@/components/superadmin/role-management-client";

export const metadata: Metadata = {
  title: "Manajemen Peran & Akses Superadmin | Agrichain",
};

export const dynamic = "force-dynamic";

export default async function SuperadminRolesPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) redirect("/masuk");

  const isAuthorized =
    process.env.NODE_ENV !== "production" ||
    session.memberships.some((m) => m.role === "CONTRACT_ADMIN" || m.role === "PRODUCER_ADMIN");

  if (!isAuthorized) {
    redirect("/mainapp/dashboard");
  }

  const db = await getDbAdapter();
  const [organizations, { users, metrics }] = await Promise.all([
    listAllOrganizations(db),
    listAllUsersWithRoles(db),
  ]);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <RoleManagementClient initialUsers={users} metrics={metrics} organizations={organizations} />
    </div>
  );
}
