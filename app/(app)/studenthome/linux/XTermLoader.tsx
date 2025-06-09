"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"

interface FileSystemEntry {
    type: "file" | "directory"
    content?: string
    children?: Record<string, FileSystemEntry>
}

declare global {
    interface Window {
        Terminal?: any
    }
}

export default function XTermLoader() {
    const [isReady, setIsReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [terminal, setTerminal] = useState<any>(null)
    const [useFallback, setUseFallback] = useState(false)
    const terminalElementRef = useRef<HTMLDivElement>(null)
    const currentLineRef = useRef("")

    const [fileSystem, setFileSystem] = useState<FileSystemEntry>({
        type: "directory",
        children: {
            home: {
                type: "directory",
                children: {
                    user: {
                        type: "directory",
                        children: {
                            documents: { type: "directory", children: {} },
                            projects: { type: "directory", children: {} },
                            "hello.py": {
                                type: "file",
                                content: 'print("Hello, World!")\nprint("Welcome to the terminal!")',
                            },
                            "sample.txt": {
                                type: "file",
                                content: "This is a sample text file.\nYou can view it with cat command.",
                            },
                        },
                    },
                },
            },
        },
    })

    const [cwd, setCwd] = useState("/home/user")
    const [commandHistory, setCommandHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [fallbackOutput, setFallbackOutput] = useState<string[]>([
        "Welcome to WebTerm - Fallback Terminal",
        'Type "help" for available commands',
        "",
        "user@webterm:~$ ",
    ])

    // Load only XTerm core (no FitAddon to avoid dimensions error)
    useEffect(() => {
        let mounted = true

        const loadLibraries = async () => {
            try {
                // Check if already loaded
                if (window.Terminal) {
                    if (mounted) setIsReady(true)
                    return
                }

                // Try to load from multiple CDNs
                const cdnOptions = [
                    {
                        css: "https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css",
                        js: "https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js",
                    },
                    {
                        css: "https://unpkg.com/xterm@5.3.0/css/xterm.css",
                        js: "https://unpkg.com/xterm@5.3.0/lib/xterm.js",
                    },
                ]

                let loaded = false

                for (const cdn of cdnOptions) {
                    try {
                        // Load CSS
                        if (!document.querySelector(`link[href="${cdn.css}"]`)) {
                            const link = document.createElement("link")
                            link.rel = "stylesheet"
                            link.href = cdn.css
                            link.crossOrigin = "anonymous"
                            document.head.appendChild(link)
                        }

                        // Load XTerm JS
                        if (!document.querySelector(`script[src="${cdn.js}"]`)) {
                            await new Promise<void>((resolve, reject) => {
                                const script = document.createElement("script")
                                script.src = cdn.js
                                script.crossOrigin = "anonymous"
                                script.onload = () => resolve()
                                script.onerror = () => reject(new Error(`Failed to load ${cdn.js}`))
                                document.head.appendChild(script)
                            })
                        }

                        // Wait for Terminal to be available
                        let attempts = 0
                        while (!window.Terminal && attempts < 30) {
                            await new Promise((resolve) => setTimeout(resolve, 100))
                            attempts++
                        }

                        if (window.Terminal) {
                            loaded = true
                            break
                        }
                    } catch (err) {
                        console.warn(`Failed to load from ${cdn.js}:`, err)
                        continue
                    }
                }

                if (!loaded) {
                    throw new Error("All CDN sources failed")
                }

                if (mounted) {
                    setIsReady(true)
                }
            } catch (err) {
                console.error("Failed to load XTerm:", err)
                if (mounted) {
                    setUseFallback(true)
                    setError("XTerm failed to load, using fallback terminal")
                }
            }
        }

        loadLibraries()

        return () => {
            mounted = false
        }
    }, [])

    // Initialize terminal when ready (without FitAddon)
    useEffect(() => {
        if (!isReady || !terminalElementRef.current || terminal || useFallback) return

        try {
            const Terminal = window.Terminal

            if (!Terminal) {
                throw new Error("Terminal not available")
            }

            const term = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: '"Cascadia Code", "Fira Code", "SF Mono", Monaco, monospace',
                theme: {
                    background: "#1a1a1a",
                    foreground: "#ffffff",
                    cursor: "#00ff41",
                    cursorAccent: "#1a1a1a",
                    selection: "#3a3a3a",
                    black: "#000000",
                    red: "#ff5555",
                    green: "#50fa7b",
                    yellow: "#f1fa8c",
                    blue: "#bd93f9",
                    magenta: "#ff79c6",
                    cyan: "#8be9fd",
                    white: "#f8f8f2",
                },
                cols: 100, // Fixed size to avoid resize issues
                rows: 30,
                scrollback: 1000,
            })

            // Open terminal without FitAddon
            term.open(terminalElementRef.current)

            // Welcome message
            term.writeln("\x1b[32m╭─────────────────────────────────────────────────────────╮\x1b[0m")
            term.writeln(
                "\x1b[32m│\x1b[0m \x1b[1;36mWelcome to WebTerm - Linux Terminal Emulator\x1b[0m           \x1b[32m│\x1b[0m",
            )
            term.writeln(
                '\x1b[32m│\x1b[0m \x1b[33mType "help" for available commands\x1b[0m                     \x1b[32m│\x1b[0m',
            )
            term.writeln("\x1b[32m╰─────────────────────────────────────────────────────────╯\x1b[0m")
            term.writeln("")
            writePrompt(term)

            setTerminal(term)

            // Handle input
            const handleData = (data: string) => {
                const char = data.charCodeAt(0)

                if (char === 13) {
                    // Enter
                    term.write("\r\n")
                    processCommand(term, currentLineRef.current.trim())
                    currentLineRef.current = ""
                    setHistoryIndex(-1)
                } else if (char === 127) {
                    // Backspace
                    if (currentLineRef.current.length > 0) {
                        term.write("\b \b")
                        currentLineRef.current = currentLineRef.current.slice(0, -1)
                    }
                } else if (char === 27 && data.length > 1 && data[1] === "[") {
                    // Arrow keys
                    if (data[2] === "A" && commandHistory.length > 0) {
                        // Up arrow
                        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
                        setHistoryIndex(newIndex)
                        term.write("\x1b[2K\r")
                        writePrompt(term)
                        currentLineRef.current = commandHistory[commandHistory.length - 1 - newIndex]
                        term.write(currentLineRef.current)
                    } else if (data[2] === "B" && historyIndex > -1) {
                        // Down arrow
                        const newIndex = historyIndex - 1
                        setHistoryIndex(newIndex)
                        term.write("\x1b[2K\r")
                        writePrompt(term)
                        if (newIndex === -1) {
                            currentLineRef.current = ""
                        } else {
                            currentLineRef.current = commandHistory[commandHistory.length - 1 - newIndex]
                            term.write(currentLineRef.current)
                        }
                    }
                } else if (char === 9) {
                    // Tab completion
                    const commands = ["help", "ls", "cd", "pwd", "mkdir", "touch", "cat", "echo", "python", "clear"]
                    const matches = commands.filter((cmd) => cmd.startsWith(currentLineRef.current))
                    if (matches.length === 1) {
                        const completion = matches[0].slice(currentLineRef.current.length)
                        term.write(completion)
                        currentLineRef.current += completion
                    }
                } else if (char >= 32 && char <= 126) {
                    // Printable characters
                    term.write(data)
                    currentLineRef.current += data
                } else if (char === 12) {
                    // Ctrl+L
                    term.clear()
                    writePrompt(term)
                } else if (char === 3) {
                    // Ctrl+C
                    term.write("^C")
                    term.write("\r\n")
                    writePrompt(term)
                    currentLineRef.current = ""
                }
            }

            const disposable = term.onData(handleData)

            return () => {
                disposable.dispose()
                term.dispose()
            }
        } catch (err) {
            console.error("Terminal initialization failed:", err)
            setUseFallback(true)
            setError("Terminal initialization failed, using fallback")
        }
    }, [isReady, terminal, useFallback])

    const writePrompt = (term: any) => {
        const shortCwd = cwd.replace("/home/user", "~")
        term.write(`\x1b[1;32muser@webterm\x1b[0m:\x1b[1;34m${shortCwd}\x1b[0m$ `)
    }

    const resolvePath = (path: string): string => {
        if (path.startsWith("/")) return path
        if (path === "~") return "/home/user"
        if (path.startsWith("~/")) return "/home/user" + path.slice(1)

        const parts = cwd.split("/").concat(path.split("/"))
        const resolved: string[] = []

        for (const part of parts) {
            if (part === "..") {
                if (resolved.length > 0) resolved.pop()
            } else if (part !== "." && part !== "") {
                resolved.push(part)
            }
        }

        return "/" + resolved.join("/")
    }

    const getPath = (path: string): FileSystemEntry | null => {
        const parts = path.split("/").filter((p) => p !== "")
        let current = fileSystem

        for (const part of parts) {
            if (current.children && current.children[part]) {
                current = current.children[part]
            } else {
                return null
            }
        }

        return current
    }

    const createFile = (path: string, content = "") => {
        const resolvedPath = resolvePath(path)
        const pathParts = resolvedPath.split("/")
        const fileName = pathParts.pop()!
        const parentPath = pathParts.join("/") || "/"
        const parentDir = getPath(parentPath)

        if (parentDir && parentDir.type === "directory") {
            setFileSystem((prev) => {
                const newFs = JSON.parse(JSON.stringify(prev))
                let current = newFs

                for (const part of parentPath.split("/").filter((p) => p !== "")) {
                    current = current.children[part]
                }

                current.children[fileName] = {
                    type: "file",
                    content,
                }

                return newFs
            })
            return true
        }
        return false
    }

    const processCommand = (term: any, cmd: string) => {
        if (cmd) {
            setCommandHistory((prev) => [...prev, cmd])
        }

        if (!cmd) {
            writePrompt(term)
            return
        }

        const args = cmd.split(/\s+/)
        const command = args[0].toLowerCase()

        switch (command) {
            case "help":
                term.writeln("\x1b[1;33mAvailable commands:\x1b[0m")
                term.writeln("  \x1b[36mls\x1b[0m [dir]       - List directory contents")
                term.writeln("  \x1b[36mcd\x1b[0m <dir>       - Change directory")
                term.writeln("  \x1b[36mpwd\x1b[0m            - Print working directory")
                term.writeln("  \x1b[36mmkdir\x1b[0m <dir>    - Create directory")
                term.writeln("  \x1b[36mtouch\x1b[0m <file>   - Create file")
                term.writeln("  \x1b[36mcat\x1b[0m <file>     - Display file contents")
                term.writeln("  \x1b[36mecho\x1b[0m <text>    - Display text")
                term.writeln("  \x1b[36mpython\x1b[0m <file>  - Run Python script")
                term.writeln("  \x1b[36mclear\x1b[0m          - Clear terminal")
                term.writeln("  \x1b[36mhelp\x1b[0m           - Show this help")
                term.writeln("")
                term.writeln("\x1b[33mKeyboard shortcuts:\x1b[0m")
                term.writeln("  \x1b[36mTab\x1b[0m            - Command completion")
                term.writeln("  \x1b[36mCtrl+C\x1b[0m         - Cancel command")
                term.writeln("  \x1b[36mCtrl+L\x1b[0m         - Clear screen")
                term.writeln("  \x1b[36m↑/↓\x1b[0m            - Command history")
                break

            case "ls":
                const lsPath = args[1] ? resolvePath(args[1]) : cwd
                const lsDir = getPath(lsPath)
                if (lsDir?.type === "directory") {
                    const items = Object.entries(lsDir.children || {})
                    if (items.length === 0) {
                        term.writeln("\x1b[2m(empty directory)\x1b[0m")
                    } else {
                        items.forEach(([name, entry]) => {
                            const color = entry.type === "directory" ? "\x1b[1;34m" : "\x1b[0m"
                            const suffix = entry.type === "directory" ? "/" : ""
                            term.writeln(`${color}${name}${suffix}\x1b[0m`)
                        })
                    }
                } else {
                    term.writeln(`\x1b[31mls: cannot access '${args[1]}': No such file or directory\x1b[0m`)
                }
                break

            case "cd":
                if (!args[1] || args[1] === "~") {
                    setCwd("/home/user")
                } else {
                    const newPath = resolvePath(args[1])
                    const dir = getPath(newPath)
                    if (dir?.type === "directory") {
                        setCwd(newPath)
                    } else {
                        term.writeln(`\x1b[31mcd: no such file or directory: ${args[1]}\x1b[0m`)
                    }
                }
                break

            case "pwd":
                term.writeln(cwd)
                break

            case "mkdir":
                if (!args[1]) {
                    term.writeln("\x1b[31mmkdir: missing operand\x1b[0m")
                } else {
                    const resolvedPath = resolvePath(args[1])
                    const pathParts = resolvedPath.split("/")
                    const dirName = pathParts.pop()!
                    const parentPath = pathParts.join("/") || "/"
                    const parentDir = getPath(parentPath)

                    if (parentDir?.type === "directory") {
                        setFileSystem((prev) => {
                            const newFs = JSON.parse(JSON.stringify(prev))
                            let current = newFs

                            for (const part of parentPath.split("/").filter((p) => p !== "")) {
                                current = current.children[part]
                            }

                            current.children[dirName] = {
                                type: "directory",
                                children: {},
                            }

                            return newFs
                        })
                        term.writeln(`\x1b[32mDirectory created: ${args[1]}\x1b[0m`)
                    } else {
                        term.writeln(`\x1b[31mmkdir: cannot create directory '${args[1]}': No such file or directory\x1b[0m`)
                    }
                }
                break

            case "touch":
                if (!args[1]) {
                    term.writeln("\x1b[31mtouch: missing file operand\x1b[0m")
                } else if (createFile(args[1])) {
                    term.writeln(`\x1b[32mFile created: ${args[1]}\x1b[0m`)
                } else {
                    term.writeln(`\x1b[31mtouch: cannot touch '${args[1]}': No such file or directory\x1b[0m`)
                }
                break

            case "cat":
                if (!args[1]) {
                    term.writeln("\x1b[31mcat: missing file operand\x1b[0m")
                } else {
                    const filePath = resolvePath(args[1])
                    const file = getPath(filePath)

                    if (file?.type === "file") {
                        const content = file.content || ""
                        if (content) {
                            content.split("\n").forEach((line) => term.writeln(line))
                        }
                    } else if (file?.type === "directory") {
                        term.writeln(`\x1b[31mcat: ${args[1]}: Is a directory\x1b[0m`)
                    } else {
                        term.writeln(`\x1b[31mcat: ${args[1]}: No such file or directory\x1b[0m`)
                    }
                }
                break

            case "echo":
                term.writeln(args.slice(1).join(" "))
                break

            case "python":
                if (!args[1]) {
                    term.writeln("\x1b[31mpython: missing file operand\x1b[0m")
                } else {
                    const filePath = resolvePath(args[1])
                    const file = getPath(filePath)

                    if (file?.type === "file") {
                        const content = file.content || ""
                        term.writeln("\x1b[33mRunning Python script...\x1b[0m")
                        const lines = content.split("\n")
                        lines.forEach((line) => {
                            const printMatch = line.match(/print$$(.+)$$/)
                            if (printMatch) {
                                let output = printMatch[1]
                                output = output.replace(/^["']|["']$/g, "")
                                term.writeln(output)
                            }
                        })
                    } else {
                        term.writeln(`\x1b[31mpython: can't open file '${args[1]}': No such file or directory\x1b[0m`)
                    }
                }
                break

            case "clear":
                term.clear()
                writePrompt(term)
                return

            case "whoami":
                term.writeln("user")
                break

            case "date":
                term.writeln(new Date().toString())
                break

            case "tree":
                const printTree = (entry: FileSystemEntry, path: string, prefix = "") => {
                    if (entry.type === "directory" && entry.children) {
                        const items = Object.entries(entry.children)
                        items.forEach(([name, child], index) => {
                            const isLast = index === items.length - 1
                            const connector = isLast ? "└── " : "├── "
                            const color = child.type === "directory" ? "\x1b[1;34m" : "\x1b[0m"
                            term.writeln(`${prefix}${connector}${color}${name}\x1b[0m`)

                            if (child.type === "directory") {
                                const newPrefix = prefix + (isLast ? "    " : "│   ")
                                printTree(child, path + "/" + name, newPrefix)
                            }
                        })
                    }
                }

                const currentDir = getPath(cwd)
                if (currentDir) {
                    term.writeln(`\x1b[1;34m${cwd}\x1b[0m`)
                    printTree(currentDir, cwd)
                }
                break

            default:
                term.writeln(`\x1b[31m${command}: command not found\x1b[0m`)
        }

        writePrompt(term)
    }

    // Fallback terminal for when XTerm fails
    const handleFallbackInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const input = e.currentTarget
            const cmd = input.value.trim()

            setFallbackOutput((prev) => [...prev, cmd])

            if (cmd === "help") {
                setFallbackOutput((prev) => [...prev, "Available commands: help, ls, cd, pwd, cat, echo, clear"])
            } else if (cmd === "clear") {
                setFallbackOutput(["user@webterm:~$ "])
            } else if (cmd) {
                setFallbackOutput((prev) => [...prev, `${cmd}: command not found`])
            }

            setFallbackOutput((prev) => [...prev, "user@webterm:~$ "])
            input.value = ""
        }
    }

    if (useFallback) {
        return (
            <div className="w-full h-screen bg-black text-green-400 font-mono p-4 overflow-auto">
                <div className="mb-4">
                    {fallbackOutput.map((line, index) => (
                        <div key={index}>{line}</div>
                    ))}
                </div>
                <div className="flex">
                    <span>user@webterm:~$ </span>
                    <input
                        type="text"
                        className="bg-transparent border-none outline-none text-green-400 flex-1 font-mono"
                        onKeyDown={handleFallbackInput}
                        autoFocus
                    />
                </div>
            </div>
        )
    }

    if (error && !useFallback) {
        return (
            <div className="w-full h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="text-center text-red-400 font-mono">
                    <div className="text-xl mb-4">⚠️ Terminal Error</div>
                    <div className="text-sm mb-4">{error}</div>
                    <div className="space-x-2">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Reload
                        </button>
                        <button
                            onClick={() => setUseFallback(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Use Fallback Terminal
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!isReady && !useFallback) {
        return (
            <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-green-400 font-mono">
                    <div className="text-xl mb-4 animate-pulse">Loading Terminal...</div>
                    <div className="text-sm mb-2">Downloading XTerm.js libraries</div>
                    <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-screen bg-black overflow-hidden">
            <div ref={terminalElementRef} className="w-full h-full focus:outline-none" style={{ fontFamily: "monospace" }} />
        </div>
    )
}
