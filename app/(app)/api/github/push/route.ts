import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function toBase64(str: string) {
    return Buffer.from(str, "utf-8").toString("base64");
}

export async function POST(req: Request) {
    const cookieStore = await cookies();
    let token = cookieStore.get("GITHUB_TOKEN")?.value;

    // Fallback to environment variable if no cookie
    if (!token) {
        token = process.env.GITHUB_TOKEN;
    }

    if (!token) {
        console.error("No GitHub token found in cookies or environment");
        return NextResponse.json({ error: "Unauthorized - No GitHub token found" }, { status: 401 });
    }

    const { owner, repo, path, content, message } = await req.json();

    // 1. Try to get the SHA (for updates)
    const shaRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "YourApp/1.0",
            },
        }
    );

    let sha: string | undefined = undefined;
    if (shaRes.ok) {
        const shaData = await shaRes.json();
        sha = shaData.sha;
    } else if (shaRes.status !== 404) {
        // Add detailed error logging
        const errorData = await shaRes.json().catch(() => ({}));
        console.error(`GitHub API Error (${shaRes.status}):`, errorData);
        return NextResponse.json(
            {
                error: "Failed to get file SHA",
                status: shaRes.status,
                details: errorData
            },
            { status: shaRes.status }
        );
    }

    // 2. Push file (create or update)
    const pushRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
            method: "PUT",
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "YourApp/1.0",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
                content: toBase64(content),
                ...(sha && { sha }),
            }),
        }
    );

    if (!pushRes.ok) {
        const errorData = await pushRes.json().catch(() => ({}));
        console.error(`GitHub Push Error (${pushRes.status}):`, errorData);
        return NextResponse.json(
            {
                error: "Push failed",
                status: pushRes.status,
                details: errorData
            },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true });
}