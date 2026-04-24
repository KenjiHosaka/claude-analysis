import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

const DEV_MODE = !process.env.AUTH_GITHUB_ID;

export default function LoginPage() {
  if (DEV_MODE) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">Claude Analysis</h1>
        <p className="text-muted-foreground">
          チームのClaude Code使用状況を可視化するダッシュボード
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            GitHubでログイン
          </button>
        </form>
      </div>
    </div>
  );
}
