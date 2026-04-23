import Link from "next/link";
import { Settings } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export async function SidebarUserMenu() {
  const session = await auth();

  if (!session?.user) return null;

  const initials = (session.user.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="px-3">
      <Separator className="mb-3" />
      <Link
        href="/settings"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
      >
        <Settings className="h-4 w-4" />
        Settings
      </Link>
      <div className="flex items-center gap-3 px-3 py-2">
        <Avatar className="h-7 w-7">
          <AvatarImage src={session.user.image ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="flex-1 truncate text-sm">{session.user.name}</span>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
