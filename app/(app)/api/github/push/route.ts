// api/github/push/route.ts - Updated with user authentication
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

function toBase64(str: string) {
    return Buffer.from(str, "utf-8").toString("base64");
}

export async function POST(req: Request) {
    try {
        // Get the user's session
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
            return NextResponse.json({
                error: "Authentication required",
                message: "Please sign in with GitHub to push files"
            }, { status: 401 });
        }

        const token = session.accessToken;
        const { owner, repo, path, content, message } = await req.json();

        // Validate required fields
        if (!owner || !repo || !path || !content || !message) {
            return NextResponse.json({
                error: "Missing required fields: owner, repo, path, content, message"
            }, { status: 400 });
        }

        // Security check: ensure user can only push to their own repos or repos they have access to
        if (owner !== session.githubUsername) {
            // Verify user has write access to the repository
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

            if (!repoCheckRes.ok || !(await repoCheckRes.json()).permissions?.push) {
                return NextResponse.json({
                    error: "Access denied - You don't have write access to this repository"
                }, { status: 403 });
            }
        }

        // Get existing file SHA (for updates)
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
            console.error(`GitHub API Error (${shaRes.status}) for user ${session.githubUsername}:`, errorData);

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

        // Push file (create or update)
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
            console.error(`GitHub Push Error (${pushRes.status}) for user ${session.githubUsername}:`, errorData);

            if (pushRes.status === 409) {
                return NextResponse.json({
                    error: "File conflict - File may have been modified by another user",
                    details: errorData
                }, { status: 409 });
            }

            if (pushRes.status === 401) {
                return NextResponse.json({
                    error: "GitHub authentication expired - Please sign in again"
                }, { status: 401 });
            }

            return NextResponse.json({
                error: "Failed to push file to repository",
                status: pushRes.status,
                details: errorData
            }, { status: 500 });
        }

        const result = await pushRes.json();
        console.log(`File '${path}' pushed successfully to ${owner}/${repo} by user ${session.githubUsername}`);

        return NextResponse.json({
            success: true,
            sha: result.content.sha,
            url: result.content.html_url,
            pushedBy: session.githubUsername
        });

    } catch (error) {
        console.error("Unexpected error in GitHub push:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}