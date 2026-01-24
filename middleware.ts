import NextAuth from "next-auth";

import authConfig from "@/auth.config";
import { DEFAULT_LOGIN_REDIRECT, apiAuthPrefix, publicRoutes, authRoutes, } from "@/routes";
import { NextResponse } from "next/server";

const {auth} = NextAuth(authConfig);

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
    const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
    const isAuthRoute = authRoutes.includes(nextUrl.pathname);
    const isPlaygroundRoute = nextUrl.pathname.startsWith('/playground');

        // Helper to add COOP/COEP headers for playground
        const withCrossOriginHeaders = (response: NextResponse) => {
            if (isPlaygroundRoute) {
                response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
                response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
            }
            return response;
        };

    if(isApiAuthRoute){
        return withCrossOriginHeaders(NextResponse.next());
    }

    if(isAuthRoute){
        if(isLoggedIn){
            return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
        }

        return withCrossOriginHeaders(NextResponse.next());
    }

    if(!isLoggedIn && !isPublicRoute){
        return Response.redirect(new URL("/auth/sign-in", nextUrl))
    }

    return withCrossOriginHeaders(NextResponse.next())

});

export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],

};

