// api/github/pull/route.ts - Updated with user authentication
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        // Get the user's session
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
            return NextResponse.json({
                error: "Authentication required",
                message: "Please sign in with GitHub to access repositories"
            }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const owner = searchParams.get("owner");
        const repo = searchParams.get("repo");
        const path = searchParams.get("path") || "README.md";

        if (!owner || !repo) {
            return NextResponse.json({
                error: "Missing required parameters: owner and repo"
            }, { status: 400 });
        }

        const token = session.accessToken;

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
            console.error(`GitHub Pull Error (${res.status}) for user ${session.githubUsername}:`, errorData);

            if (res.status === 404) {
                return NextResponse.json({
                    error: "File not found",
                    path,
                    repository: `${owner}/${repo}`
                }, { status: 404 });
            }

            if (res.status === 403) {
                return NextResponse.json({
                    error: "Access denied - Check repository permissions or sign in again"
                }, { status: 403 });
            }

            if (res.status === 401) {
                return NextResponse.json({
                    error: "GitHub authentication expired - Please sign in again"
                }, { status: 401 });
            }

            return NextResponse.json({
                error: "Failed to fetch file",
                status: res.status,
                details: errorData
            }, { status: res.status });
        }

        const content = await res.text();
        console.log(`File '${path}' pulled successfully from ${owner}/${repo} by user ${session.githubUsername}`);

        return NextResponse.json({
            content,
            path,
            repository: `${owner}/${repo}`,
            accessedBy: session.githubUsername
        });

    } catch (error) {
        console.error("Unexpected error in GitHub pull:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
            return NextResponse.json({
                error: "Authentication required",
                message: "Please sign in with GitHub to access repositories"
            }, { status: 401 });
        }

        const { owner, repo, path = "README.md" } = await request.json();

        if (!owner || !repo) {
            return NextResponse.json({
                error: "Missing required fields: owner and repo"
            }, { status: 400 });
        }

        const token = session.accessToken;

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
            repository: `${owner}/${repo}`,
            accessedBy: session.githubUsername
        });

    } catch (error) {
        console.error("Unexpected error in GitHub pull POST:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}