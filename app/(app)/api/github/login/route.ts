import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const clientId = process.env.GITHUB_CLIENT_ID;

        if (!clientId) {
            console.error("GITHUB_CLIENT_ID not found in environment variables");
            return NextResponse.json({
                error: "GitHub OAuth not configured"
            }, { status: 500 });
        }

        // Get the current URL to set as redirect after auth
        const { searchParams } = new URL(request.url);
        const redirect = searchParams.get("redirect") || "/dashboard";

        // Store redirect URL in state parameter (URL-encoded)
        const state = encodeURIComponent(redirect);

        // Comprehensive GitHub permissions for your app
        const scopes = [
            "repo",              // Full repository access
            "workflow",          // GitHub Actions workflows
            "write:packages",    // Write packages
            "read:packages",     // Read packages
            "user",              // User profile access
            "read:org",          // Read organization data
        ].join(",");

        const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scopes}&state=${state}`;

        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        console.error("Error in GitHub auth redirect:", error);
        return NextResponse.json({
            error: "Failed to initiate GitHub authentication"
        }, { status: 500 });
    }
}