import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function toBase64(str: string) {
    return Buffer.from(str, "utf-8").toString("base64");
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        let token = cookieStore.get("github_token")?.value;

        // Fallback to environment variable if no cookie (for admin operations)
        if (!token) {
            token = process.env.GITHUB_TOKEN;
            console.warn("Using fallback GitHub token from environment");
        }

        if (!token) {
            console.error("No GitHub token found in cookies or environment");
            return NextResponse.json({
                error: "Unauthorized - Please connect your GitHub account"
            }, { status: 401 });
        }

        const { owner, repo, path, content, message } = await req.json();

        // Validate required fields
        if (!owner || !repo || !path || !content || !message) {
            return NextResponse.json({
                error: "Missing required fields: owner, repo, path, content, message"
            }, { status: 400 });
        }

        // 1. Try to get the SHA (for updates)
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

        let sha: string | undefined = undefined;
        if (shaRes.ok) {
            const shaData = await shaRes.json();
            sha = shaData.sha;
        } else if (shaRes.status !== 404) {
            const errorData = await shaRes.json().catch(() => ({}));
            console.error(`GitHub API Error (${shaRes.status}):`, errorData);

            // Handle specific GitHub API errors
            if (shaRes.status === 403) {
                return NextResponse.json({
                    error: "Access denied - Check repository permissions",
                    details: errorData
                }, { status: 403 });
            }

            return NextResponse.json({
                error: "Failed to get file information",
                status: shaRes.status,
                details: errorData
            }, { status: shaRes.status });
        }

        // 2. Push file (create or update)
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

        if (!pushRes.ok) {
            const errorData = await pushRes.json().catch(() => ({}));
            console.error(`GitHub Push Error (${pushRes.status}):`, errorData);

            // Handle specific errors
            if (pushRes.status === 409) {
                return NextResponse.json({
                    error: "File conflict - File may have been modified by another user",
                    details: errorData
                }, { status: 409 });
            }

            return NextResponse.json({
                error: "Failed to push file to repository",
                status: pushRes.status,
                details: errorData
            }, { status: 500 });
        }

        const result = await pushRes.json();
        return NextResponse.json({
            success: true,
            sha: result.content.sha,
            url: result.content.html_url
        });

    } catch (error) {
        console.error("Unexpected error in GitHub push:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}