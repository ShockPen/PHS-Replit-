import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("github_token")?.value;

        if (!token) {
            return NextResponse.json({
                error: "Authentication required",
                message: "Please sign in with GitHub to create repositories"
            }, { status: 401 });
        }

        const body = await req.json();
        const {
            name,
            description = "",
            isPrivate = false,
            autoInit = true,
            gitignoreTemplate,
            licenseTemplate,
            allowSquashMerge = true,
            allowMergeCommit = true,
            allowRebaseMerge = true,
            hasIssues = true,
            hasProjects = true,
            hasWiki = true
        } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({
                error: "Repository name is required and must be a non-empty string"
            }, { status: 400 });
        }

        const nameRegex = /^[a-zA-Z0-9._-]+$/;
        if (!nameRegex.test(name)) {
            return NextResponse.json({
                error: "Repository name can only contain alphanumeric characters, periods, hyphens, and underscores"
            }, { status: 400 });
        }

        const repoPayload: any = {
            name: name.trim(),
            description: description.trim(),
            private: Boolean(isPrivate),
            auto_init: Boolean(autoInit),
            allow_squash_merge: Boolean(allowSquashMerge),
            allow_merge_commit: Boolean(allowMergeCommit),
            allow_rebase_merge: Boolean(allowRebaseMerge),
            has_issues: Boolean(hasIssues),
            has_projects: Boolean(hasProjects),
            has_wiki: Boolean(hasWiki),
        };

        if (gitignoreTemplate?.trim()) {
            repoPayload.gitignore_template = gitignoreTemplate.trim();
        }

        if (licenseTemplate?.trim()) {
            repoPayload.license_template = licenseTemplate.trim();
        }

        const response = await fetch("https://api.github.com/user/repos", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "SchoolNest/1.0",
            },
            body: JSON.stringify(repoPayload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("GitHub API error:", data);

            if (response.status === 422 && Array.isArray(data.errors)) {
                const exists = data.errors.some((e: any) => e.message?.includes("name already exists"));
                if (exists) {
                    return NextResponse.json({ error: `Repository '${name}' already exists` }, { status: 409 });
                }
            }

            return NextResponse.json({
                error: data.message || "Failed to create repository",
                details: data.errors || null
            }, { status: response.status });
        }

        const sanitizedRepo = {
            id: data.id,
            name: data.name,
            full_name: data.full_name,
            description: data.description,
            private: data.private,
            html_url: data.html_url,
            clone_url: data.clone_url,
            ssh_url: data.ssh_url,
            git_url: data.git_url,
            created_at: data.created_at,
            updated_at: data.updated_at,
            language: data.language,
            default_branch: data.default_branch,
        };

        console.log(`Repository '${name}' created successfully`);
        return NextResponse.json({ success: true, repository: sanitizedRepo });

    } catch (error) {
        console.error("Internal server error in create-repo:", error);
        return NextResponse.json({
            error: "Internal server error - Failed to create repository"
        }, { status: 500 });
    }
}
