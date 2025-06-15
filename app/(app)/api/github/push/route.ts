import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function toBase64(str: string) {
    return Buffer.from(str, "utf-8").toString("base64");
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("github_token")?.value;

        if (!token) {
            return NextResponse.json(
                {
                    error: "Authentication required",
                    message: "Please sign in with GitHub to push files",
                },
                { status: 401 }
            );
        }

        const { owner, repo, path, content, message } = await req.json();

        if (!owner || !repo || !path || !content || !message) {
            return NextResponse.json(
                {
                    error: "Missing required fields: owner, repo, path, content, message",
                },
                { status: 400 }
            );
        }

        // Optional: check repo permissions if owner doesn't match authenticated user
        const repoCheckRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "SchoolNest/1.0",
                },
            }
        );

        const repoData = await repoCheckRes.json();
        if (!repoCheckRes.ok || !repoData.permissions?.push) {
            return NextResponse.json(
                {
                    error: "Access denied - You don't have write access to this repository",
                },
                { status: 403 }
            );
        }

        // Check if file exists to get its SHA
        const shaRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "SchoolNest/1.0",
                },
            }
        );

        let sha: string | undefined;
        if (shaRes.ok) {
            const shaData = await shaRes.json();
            sha = shaData.sha;
        } else if (shaRes.status !== 404) {
            const errorData = await shaRes.json().catch(() => ({}));
            return NextResponse.json(
                {
                    error: "Failed to get file information",
                    status: shaRes.status,
                    details: errorData,
                },
                { status: shaRes.status }
            );
        }

        // Push the file (create or update)
        const pushRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "SchoolNest/1.0",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message,
                    content: toBase64(content),
                    ...(sha && { sha }),
                }),
            }
        );

        const result = await pushRes.json().catch(() => ({}));

        if (!pushRes.ok) {
            return NextResponse.json(
                {
                    error:
                        pushRes.status === 409
                            ? "File conflict - File may have been modified by another user"
                            : pushRes.status === 401
                                ? "GitHub authentication expired - Please sign in again"
                                : "Failed to push file to repository",
                    status: pushRes.status,
                    details: result,
                },
                { status: pushRes.status }
            );
        }

        return NextResponse.json({
            success: true,
            sha: result.content.sha,
            url: result.content.html_url,
        });
    } catch (error) {
        console.error("Unexpected error in GitHub push:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
