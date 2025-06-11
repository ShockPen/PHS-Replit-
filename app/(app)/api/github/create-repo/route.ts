import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        let token = cookieStore.get("github_token")?.value;

        // Fallback to environment variable if no cookie (for admin operations)
        if (!token) {
            token = process.env.GITHUB_TOKEN;
            console.warn("Using fallback GitHub token from environment for repo creation");
        }

        if (!token) {
            console.error("No GitHub token found in cookies or environment");
            return NextResponse.json({
                error: "Unauthorized - Please connect your GitHub account to create repositories"
            }, { status: 401 });
        }

        const body = await req.json();
        const {
            name,
            description = "",
            isPrivate = true,
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

        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({
                error: "Repository name is required and must be a non-empty string"
            }, { status: 400 });
        }

        // Validate repository name format
        const nameRegex = /^[a-zA-Z0-9._-]+$/;
        if (!nameRegex.test(name)) {
            return NextResponse.json({
                error: "Repository name can only contain alphanumeric characters, periods, hyphens, and underscores"
            }, { status: 400 });
        }

        // Prepare repository creation payload
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

        // Add optional templates if provided
        if (gitignoreTemplate && gitignoreTemplate.trim()) {
            repoPayload.gitignore_template = gitignoreTemplate.trim();
        }

        if (licenseTemplate && licenseTemplate.trim()) {
            repoPayload.license_template = licenseTemplate.trim();
        }

        // Create the repository
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

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`GitHub API error (${response.status}):`, errorData);

            // Handle specific GitHub API errors
            if (response.status === 422) {
                if (errorData.errors?.some((e: any) => e.message?.includes("already exists"))) {
                    return NextResponse.json({
                        error: `Repository '${name}' already exists in your account`
                    }, { status: 409 });
                }
                return NextResponse.json({
                    error: "Invalid repository configuration",
                    details: errorData.errors || errorData.message
                }, { status: 422 });
            }

            if (response.status === 403) {
                return NextResponse.json({
                    error: "Access denied - You may have reached your repository limit or lack permissions"
                }, { status: 403 });
            }

            if (response.status === 401) {
                return NextResponse.json({
                    error: "Invalid or expired GitHub token - Please reconnect your GitHub account"
                }, { status: 401 });
            }

            return NextResponse.json({
                error: "Failed to create repository",
                status: response.status,
                details: errorData
            }, { status: response.status });
        }

        const data = await response.json();

        // Return sanitized repository data
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
            permissions: data.permissions,
        };

        console.log(`Repository '${name}' created successfully for user`);
        return NextResponse.json({
            success: true,
            repository: sanitizedRepo,
            message: `Repository '${name}' created successfully`
        });

    } catch (error) {
        console.error("Internal server error in create-repo:", error);
        return NextResponse.json({
            error: "Internal server error - Failed to create repository"
        }, { status: 500 });
    }
}

// GET method to fetch available templates
export async function GET() {
    try {
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

        // Fetch available gitignore templates
        const gitignoreRes = await fetch("https://api.github.com/gitignore/templates", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "SchoolNest/1.0",
            },
        });

        // Fetch available license templates
        const licensesRes = await fetch("https://api.github.com/licenses", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "SchoolNest/1.0",
            },
        });

        const templates: any = {
            gitignore: [],
            licenses: []
        };

        if (gitignoreRes.ok) {
            templates.gitignore = await gitignoreRes.json();
        }

        if (licensesRes.ok) {
            const licenses = await licensesRes.json();
            templates.licenses = licenses.map((license: any) => ({
                key: license.key,
                name: license.name,
                spdx_id: license.spdx_id
            }));
        }

        return NextResponse.json(templates);

    } catch (error) {
        console.error("Error fetching templates:", error);
        return NextResponse.json({
            error: "Failed to fetch repository templates"
        }, { status: 500 });
    }
}