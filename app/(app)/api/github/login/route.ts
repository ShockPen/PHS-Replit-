// Test GitHub API Requesting
import { NextResponse } from "next/server";

export async function GET() {
    const clientId = process.env.GITHUB_CLIENT_ID!;
    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`;
    return NextResponse.redirect(redirectUrl);
}
