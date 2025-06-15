import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        // Handle OAuth errors
        if (error) {
            console.error("GitHub OAuth error:", error);
            const redirectUrl = new URL("/auth/error", request.url);
            redirectUrl.searchParams.set("error", error);
            return NextResponse.redirect(redirectUrl);
        }

        if (!code) {
            console.error("No authorization code received from GitHub");
            return NextResponse.redirect("/auth/error?error=no_code");
        }

        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error("Missing GitHub OAuth credentials");
            return NextResponse.redirect("/auth/error?error=missing_credentials");
        }

        // Exchange code for access token
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "User-Agent": "SchoolNest/1.0",
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        });

        if (!tokenRes.ok) {
            console.error("Failed to exchange code for token:", tokenRes.status);
            return NextResponse.redirect("/auth/error?error=token_exchange_failed");
        }

        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            console.error("GitHub token error:", tokenData.error_description);
            return NextResponse.redirect(`/auth/error?error=${tokenData.error}`);
        }

        const accessToken = tokenData.access_token;

        if (!accessToken) {
            console.error("No access token received from GitHub");
            return NextResponse.redirect("/auth/error?error=no_token");
        }

        // Optional: Verify the token by fetching user info
        const userRes = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "SchoolNest/1.0",
            },
        });

        if (!userRes.ok) {
            console.error("Failed to verify GitHub token");
            return NextResponse.redirect("/auth/error?error=token_invalid");
        }

        // Determine redirect URL
        const redirectTo = state ? decodeURIComponent(state) : "/dashboard";

        // Store token in secure httpOnly cookie
        const response = NextResponse.redirect(new URL(redirectTo, request.url));

        response.cookies.set("github_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
        });

        // Optional: Set a flag that user is authenticated
        response.cookies.set("github_connected", "true", {
            httpOnly: false, // Allow client-side access for UI state
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
        });

        return response;

    } catch (error) {
        console.error("Unexpected error in GitHub callback:", error);
        return NextResponse.redirect("/auth/error?error=unexpected_error");
    }
}

// Logout endpoint to clear GitHub token
export async function DELETE() {
    try {
        const response = NextResponse.json({ success: true });

        // Clear the GitHub token cookie
        response.cookies.delete("github_token");
        response.cookies.delete("github_connected");

        return response;

    } catch (error) {
        console.error("Error clearing GitHub token:", error);
        return NextResponse.json({
            error: "Failed to logout"
        }, { status: 500 });
    }
}