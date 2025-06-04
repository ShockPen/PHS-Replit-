// Test GitHub API Requesting
import { NextResponse } from "next/server";

//Redirects the user to the GitHub login to authorize for creation of repositories
export async function GET() {
    const clientId = process.env.GITHUB_CLIENT_ID!;

    //Authorizes the actual account to give specified permissions to the user in Schoolnest
    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,workflow,admin:repo_hook,write:packages,read:packages,user,read:org`;
    return NextResponse.redirect(redirectUrl);
}
