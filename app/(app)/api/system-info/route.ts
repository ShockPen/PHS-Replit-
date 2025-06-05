import { NextResponse } from "next/server"
import os from "os"

export async function GET() {
    try {
        const systemInfo = {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            username: os.userInfo().username,
            shell: process.env.SHELL || "bash",
            nodeVersion: process.version,
            totalmem: os.totalmem(),
            freemem: os.freemem(),
            uptime: os.uptime(),
            loadavg: os.loadavg(),
        }

        return NextResponse.json(systemInfo)
    } catch (error) {
        return NextResponse.json({ error: "Failed to get system info" }, { status: 500 })
    }
}
