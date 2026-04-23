import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { repositories } from "@/lib/db/schema";
import { SidebarNav } from "./sidebar-nav";
import { RepositorySelector } from "./repository-selector";
import { SidebarUserMenu } from "./sidebar-user-menu";

export async function Sidebar() {
  await connection();
  const repos = await db.select().from(repositories);

  return (
    <aside className="flex h-screen w-64 flex-col border-r">
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold">Claude Analysis</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarNav />

        <div className="mt-4 px-3">
          <Suspense>
            <RepositorySelector
              repositories={repos.map((r) => ({
                id: r.id,
                owner: r.owner,
                name: r.name,
              }))}
            />
          </Suspense>
        </div>
      </div>

      <div className="pb-4">
        <SidebarUserMenu />
      </div>
    </aside>
  );
}
