import { auth } from "@/lib/auth";

export const proxy = auth;

export const config = {
  matcher: [
    "/((?!login|api/auth|api/collect|_next/static|_next/image|favicon.ico).*)",
  ],
};
