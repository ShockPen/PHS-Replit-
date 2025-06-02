// app/api/github/create-repo/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description = "", isPrivate = true } = body;

        const response = await fetch("https://api.github.com/user/repos", {
            method: "POST",
            headers: {
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name,
                description,
                private: isPrivate,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("GitHub API error:", data);
            return NextResponse.json({ error: data }, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Internal server error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}