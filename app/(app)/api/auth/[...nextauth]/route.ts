import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

// Helper function to ensure required env vars are set
function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
}

const authOptions = {
    providers: [
        GithubProvider({
            clientId: getEnv("GITHUB_ID"),
            clientSecret: getEnv("GITHUB_SECRET"),
        }),
        GoogleProvider({
            clientId: getEnv("GOOGLE_CLIENT_ID"),
            clientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
        }),
    ],
    secret: getEnv("NEXTAUTH_SECRET"),
};

const handler = NextAuth(authOptions);

// Only export the HTTP methods you need
export { handler as GET, handler as POST };