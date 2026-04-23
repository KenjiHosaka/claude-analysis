import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface MemberHeaderProps {
  user: {
    userId: string;
    userName: string;
    avatarUrl: string;
  };
}

export function MemberHeader({ user }: MemberHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href="/members"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        メンバー一覧
      </Link>
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarImage src={user.avatarUrl} alt={user.userName} />
          <AvatarFallback>
            {user.userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold">{user.userName}</h3>
        </div>
      </div>
    </div>
  );
}
