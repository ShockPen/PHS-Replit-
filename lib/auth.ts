// lib/auth.ts - NextAuth configuration with GitHub OAuth
import { NextAuthOptions } from "next-auth"
import GitHubProvider from "next-auth/providers/github"

export const authOptions: NextAuthOptions = {
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "read:user user:email repo public_repo delete_repo admin:repo_hook",
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            // Store the GitHub access token in the JWT
            if (account) {
                token.accessToken = account.access_token
                token.githubId = account.providerAccountId
                token.githubUsername = (profile as { login?: string })?.login;
            }
            return token
        },
        async session({ session, token }) {
            // Send properties to the client
            session.accessToken = token.accessToken as string
            session.githubId = token.githubId as string
            session.githubUsername = token.githubUsername as string
            return session
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
    session: {
        strategy: "jwt",
    },
}

// types/next-auth.d.ts - Extend NextAuth types
import NextAuth from "next-auth"

declare module "next-auth" {
    interface Session {
        accessToken?: string
        githubId?: string
        githubUsername?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string
        githubId?: string
        githubUsername?: string
    }
}