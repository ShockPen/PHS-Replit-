import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { authOptions } from "@/app/(app)/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }

export default NextAuth ({ 
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
  signIn: "/login", 
},
});
