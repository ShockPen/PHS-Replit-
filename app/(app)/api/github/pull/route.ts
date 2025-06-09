import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const cookieStore = await cookies()
    let token = cookieStore.get("GITHUB_TOKEN")?.value

    // Fallback to environment variable if no cookie
    if (!token) {
        token = process.env.GITHUB_TOKEN
    }

    if (!token) {
        console.error("No GitHub token found in cookies or environment")
        return NextResponse.json({ error: "Unauthorized - No GitHub token found" }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const owner = searchParams.get("owner")
    const repo = searchParams.get("repo")
    const path = searchParams.get("path") || "README.md"

    if (!owner || !repo) {
        return NextResponse.json({ error: "Missing owner or repo parameter" }, { status: 400 })
    }

    try {
        // Fetch file content from GitHub
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3.raw",
                "User-Agent": "YourApp/1.0",
            },
        })

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            console.error(`GitHub API Error (${res.status}):`, errorData)
            return NextResponse.json(
                {
                    error: "Failed to fetch file",
                    status: res.status,
                    details: errorData,
                },
                { status: res.status },
            )
        }

        const content = await res.text()
        return NextResponse.json({ content, path, owner, repo })
    } catch (error) {
        console.error("Internal server error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
