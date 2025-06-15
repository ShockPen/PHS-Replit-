import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("github_token")?.value;

        if (!token) {
            return NextResponse.json({
                error: "Not authenticated - Please connect your GitHub account"
            }, { status: 401 });
        }

        const res = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "SchoolNest/1.0",
            },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            console.error(`GitHub User API Error (${res.status}):`, data);

            if (res.status === 401) {
                return NextResponse.json({
                    error: "Invalid or expired GitHub token",
                    details: data
                }, { status: 401 });
            }

            return NextResponse.json({
                error: "Failed to fetch user information",
                details: data
            }, { status: res.status });
        }

        const sanitizedUser = {
            id: data.id,
            login: data.login,
            name: data.name,
            email: data.email,
            avatar_url: data.avatar_url,
            html_url: data.html_url,
            public_repos: data.public_repos,
            followers: data.followers,
            following: data.following,
            created_at: data.created_at,
        };

        return NextResponse.json(sanitizedUser);

    } catch (error) {
        console.error("Unexpected error in GitHub user GET:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}

export async function POST() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("github_token")?.value;

        if (!token) {
            return NextResponse.json({
                error: "Not authenticated - Please connect your GitHub account"
            }, { status: 401 });
        }

        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "SchoolNest/1.0",
            },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            console.error(`GitHub Repos API Error (${res.status}):`, data);
            return NextResponse.json({
                error: "Failed to fetch repositories",
                details: data
            }, { status: res.status });
        }

        const sanitizedRepos = data.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            private: repo.private,
            html_url: repo.html_url,
            clone_url: repo.clone_url,
            updated_at: repo.updated_at,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
        }));

        return NextResponse.json({ repositories: sanitizedRepos });

    } catch (error) {
        console.error("Unexpected error in GitHub user POST:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}
