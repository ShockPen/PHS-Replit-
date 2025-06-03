import GithubProvider from "next-auth/providers/github";
import { NextAuthOptions } from "next-auth";

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
            if (account?.provider === "github") {
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            return session;
        },
    },
};