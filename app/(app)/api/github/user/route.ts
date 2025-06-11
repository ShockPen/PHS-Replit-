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

        // Fetch user information
        const res = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "SchoolNest/1.0",
            },
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error(`GitHub User API Error (${res.status}):`, errorData);

            if (res.status === 401) {
                return NextResponse.json({
                    error: "Invalid or expired GitHub token"
                }, { status: 401 });
            }

            return NextResponse.json({
                error: "Failed to fetch user information",
                status: res.status,
                details: errorData
            }, { status: res.status });
        }

        const user = await res.json();

        // Return only necessary user information (security best practice)
        const sanitizedUser = {
            id: user.id,
            login: user.login,
            name: user.name,
            email: user.email,
            avatar_url: user.avatar_url,
            html_url: user.html_url,
            public_repos: user.public_repos,
            followers: user.followers,
            following: user.following,
            created_at: user.created_at,
        };

        return NextResponse.json(sanitizedUser);

    } catch (error) {
        console.error("Unexpected error in GitHub user:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}

// POST method to get user repositories
export async function POST() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("github_token")?.value;

        if (!token) {
            return NextResponse.json({
                error: "Not authenticated - Please connect your GitHub account"
            }, { status: 401 });
        }

        // Fetch user repositories
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "SchoolNest/1.0",
            },
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return NextResponse.json({
                error: "Failed to fetch repositories",
                status: res.status,
                details: errorData
            }, { status: res.status });
        }

        const repos = await res.json();

        // Return sanitized repository information
        const sanitizedRepos = repos.map((repo: any) => ({
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
        console.error("Unexpected error in GitHub repos:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}