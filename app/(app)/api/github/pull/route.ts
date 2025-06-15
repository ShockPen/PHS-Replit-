import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function fetchFileContent({
                                    token,
                                    owner,
                                    repo,
                                    path,
                                }: {
    token: string;
    owner: string;
    repo: string;
    path: string;
}) {
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

    const content = await res.text().catch(() => "");
    return { res, content };
}

export async function GET(request: Request) {
    try {
        const token = (await cookies()).get("github_token")?.value;

        if (!token) {
            return NextResponse.json(
                {
                    error: "Authentication required",
                    message: "Please sign in with GitHub to access repositories",
                },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const owner = searchParams.get("owner");
        const repo = searchParams.get("repo");
        const path = searchParams.get("path") || "README.md";

        if (!owner || !repo) {
            return NextResponse.json(
                {
                    error: "Missing required parameters: owner and repo",
                },
                { status: 400 }
            );
        }

        const { res, content } = await fetchFileContent({ token, owner, repo, path });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error(`GitHub Pull Error (${res.status}):`, errorData);

            if (res.status === 404) {
                return NextResponse.json(
                    {
                        error: "File not found",
                        path,
                        repository: `${owner}/${repo}`,
                    },
                    { status: 404 }
                );
            }

            if (res.status === 403) {
                return NextResponse.json(
                    {
                        error: "Access denied - Check repository permissions or sign in again",
                    },
                    { status: 403 }
                );
            }

            if (res.status === 401) {
                return NextResponse.json(
                    {
                        error: "GitHub authentication expired - Please sign in again",
                    },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                {
                    error: "Failed to fetch file",
                    status: res.status,
                    details: errorData,
                },
                { status: res.status }
            );
        }

        return NextResponse.json({
            content,
            path,
            repository: `${owner}/${repo}`,
        });
    } catch (error) {
        console.error("Unexpected error in GitHub pull GET:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const token = (await cookies()).get("github_token")?.value;

        if (!token) {
            return NextResponse.json(
                {
                    error: "Authentication required",
                    message: "Please sign in with GitHub to access repositories",
                },
                { status: 401 }
            );
        }

        const { owner, repo, path = "README.md" } = await request.json();

        if (!owner || !repo) {
            return NextResponse.json(
                {
                    error: "Missing required fields: owner and repo",
                },
                { status: 400 }
            );
        }

        const { res, content } = await fetchFileContent({ token, owner, repo, path });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return NextResponse.json(
                {
                    error: "Failed to fetch file",
                    status: res.status,
                    details: errorData,
                },
                { status: res.status }
            );
        }

        return NextResponse.json({
            content,
            path,
            repository: `${owner}/${repo}`,
        });
    } catch (error) {
        console.error("Unexpected error in GitHub pull POST:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
