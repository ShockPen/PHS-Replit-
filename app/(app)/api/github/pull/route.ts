import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const owner = searchParams.get("owner");
        const repo = searchParams.get("repo");
        const path = searchParams.get("path") || "README.md";

        if (!owner || !repo) {
            return NextResponse.json({
                error: "Missing required parameters: owner and repo"
            }, { status: 400 });
        }

        const cookieStore = await cookies();
        let token = cookieStore.get("github_token")?.value;

        // Fallback to environment variable if no cookie
        if (!token) {
            token = process.env.GITHUB_TOKEN;
            console.warn("Using fallback GitHub token from environment");
        }

        if (!token) {
            return NextResponse.json({
                error: "Unauthorized - Please connect your GitHub account"
            }, { status: 401 });
        }

        // Fetch file content from GitHub
        const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3.raw",
                    "User-Agent": "SchoolNest/1.0",
                },
            }
        );

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error(`GitHub Pull Error (${res.status}):`, errorData);

            if (res.status === 404) {
                return NextResponse.json({
                    error: "File not found",
                    path,
                    repository: `${owner}/${repo}`
                }, { status: 404 });
            }

            if (res.status === 403) {
                return NextResponse.json({
                    error: "Access denied - Check repository permissions"
                }, { status: 403 });
            }

            return NextResponse.json({
                error: "Failed to fetch file",
                status: res.status,
                details: errorData
            }, { status: res.status });
        }

        const content = await res.text();
        return NextResponse.json({
            content,
            path,
            repository: `${owner}/${repo}`
        });

    } catch (error) {
        console.error("Unexpected error in GitHub pull:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}

// POST method for fetching multiple files or with body parameters
export async function POST(request: Request) {
    try {
        const { owner, repo, path = "README.md" } = await request.json();

        if (!owner || !repo) {
            return NextResponse.json({
                error: "Missing required fields: owner and repo"
            }, { status: 400 });
        }

        const cookieStore = await cookies();
        let token = cookieStore.get("github_token")?.value;

        if (!token) {
            token = process.env.GITHUB_TOKEN;
        }

        if (!token) {
            return NextResponse.json({
                error: "Unauthorized - Please connect your GitHub account"
            }, { status: 401 });
        }

        const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3.raw",
                    "User-Agent": "SchoolNest/1.0",
                },
            }
        );

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return NextResponse.json({
                error: "Failed to fetch file",
                status: res.status,
                details: errorData
            }, { status: res.status });
        }

        const content = await res.text();
        return NextResponse.json({
            content,
            path,
            repository: `${owner}/${repo}`
        });

    } catch (error) {
        console.error("Unexpected error in GitHub pull POST:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}