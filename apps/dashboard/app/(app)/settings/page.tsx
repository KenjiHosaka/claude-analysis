import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import {
  getApiKey,
  generateApiKey,
  getRepositories,
  addRepository,
  deleteRepository,
} from "@/lib/db/queries/settings";
import { Header } from "@/components/layout/header";
import { ProfileSection } from "@/components/settings/profile-section";
import { ApiKeySection } from "@/components/settings/api-key-section";
import { RepositorySection } from "@/components/settings/repository-section";

export default async function SettingsPage() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [apiKey, repos] = await Promise.all([
    getApiKey(userId),
    getRepositories(),
  ]);

  async function handleGenerateKey(): Promise<string> {
    "use server";
    const s = await auth();
    if (!s?.user?.id) throw new Error("Unauthorized");
    return generateApiKey(s.user.id);
  }

  async function handleAddRepo(owner: string, name: string): Promise<void> {
    "use server";
    const s = await auth();
    if (!s?.user?.id) throw new Error("Unauthorized");
    await addRepository(owner, name);
  }

  async function handleDeleteRepo(id: string): Promise<void> {
    "use server";
    const s = await auth();
    if (!s?.user?.id) throw new Error("Unauthorized");
    await deleteRepository(id);
  }

  return (
    <>
      <Header title="Settings" />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <ProfileSection />
        <ApiKeySection
          initialKey={
            apiKey
              ? {
                  keyPrefix: apiKey.keyPrefix,
                  createdAt: apiKey.createdAt.toISOString(),
                }
              : null
          }
          generateAction={handleGenerateKey}
        />
        <RepositorySection
          initialRepos={repos}
          addAction={handleAddRepo}
          deleteAction={handleDeleteRepo}
        />
      </div>
    </>
  );
}
