// app/api/github/pull/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

//Requests information from the GitHub API to interpret
export async function GET() {
    const token = (await cookies()).get("github_token")?.value;
    const repo = "username/repo"; // dynamic per user, ideally passed as query

    //Receives file data from GitHub on the pull
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/README.md`, {
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3.raw",
        },
    });

    //Incase of error
    if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
    }

    const content = await res.text();
    return NextResponse.json({ content });
}
