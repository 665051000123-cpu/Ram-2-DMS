import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - api/settings/public
     * - _next (static files and Next.js internals)
     * - favicon.ico (favicon file)
     * - login
     */
    "/((?!api/auth|api/settings/public|_next|favicon.ico|login).*)",
  ],
};
