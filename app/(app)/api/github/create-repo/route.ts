// app/api/github/create-repo/route.ts
import { NextResponse } from "next/server";

//Sends a data update request to GitHub
export async function POST(req: Request) {
    try {

        //Settings for the repository itself (what configurations should be set)
        const body = await req.json();
        const { name, description = "", isPrivate = true } = body;

        //Creates the actual repository
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

        //Checks back for errors within the request
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