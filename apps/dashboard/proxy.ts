import { NextResponse } from "next/server";

const DEV_MODE = !process.env.AUTH_GITHUB_ID;

export const proxy = DEV_MODE
  ? () => NextResponse.next()
  : async () => {
      // In production, use Auth.js middleware
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      if (!session) {
        return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
      }
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!login|api/auth|api/collect|_next/static|_next/image|favicon.ico).*)",
  ],
};
