import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isOnboarding = req.nextUrl.pathname.startsWith("/onboarding");
    
    if (token) {
      const isComplete = token.profileComplete;
      
      if (!isComplete && !isOnboarding) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
      if (isComplete && isOnboarding) {
        return NextResponse.redirect(new URL("/chat", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/chat/:path*", "/onboarding"],
};