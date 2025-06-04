//NextAuth Config for GitHub

import GithubProvider from "next-auth/providers/github";
import { NextAuthOptions } from "next-auth";
import { cookies } from "next/headers"; // Add this for reading cookies in app router

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
            authorization: {
                params: {
                    scope: 'repo user:email',
                },
            },
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, account }) {
            // Attach access token from GitHub
            if (account?.provider === "github") {
                token.accessToken = account.access_token;
            }

            // Assign role from cookie (set in /api/auth/github?role=teacher etc.)
            const cookieStore = await cookies();
            const loginRole = cookieStore.get("loginRole")?.value;

            if (loginRole) {
                token.role = loginRole;
            }

            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            if (token?.role) {
                session.user.role = token.role; // Attach role to session
            }
            return session;
        },
    },
};
