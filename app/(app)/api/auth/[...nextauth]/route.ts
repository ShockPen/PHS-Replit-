import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google"; // If you want to re-enable Google later

// Helper function to ensure required env vars are set
function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
}

const handler = NextAuth({
    providers: [
        GithubProvider({
            clientId: getEnv("GITHUB_ID"),
            clientSecret: getEnv("GITHUB_SECRET"),
        }),
    ],
    secret: getEnv("NEXTAUTH_SECRET"),
});

export { handler as GET, handler as POST };
