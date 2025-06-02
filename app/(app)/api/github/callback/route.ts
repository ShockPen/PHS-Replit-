// app/api/github/callback/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
        }),
    });

    const data = await res.json();
    const accessToken = data.access_token;

    // Store token in cookie/session (example below stores in cookie)
    const response = NextResponse.redirect("/"); // or dashboard
    response.cookies.set("github_token", accessToken, { httpOnly: true });
    return response;
}
