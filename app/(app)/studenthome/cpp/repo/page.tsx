"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"

import { Link, Button } from "@nextui-org/react"
import { BentoGrid, BentoGridItem } from "@/app/components/ui/bento-grid"
import { BackgroundLines } from "@/app/components/ui/background-lines"
import { FloatingNav } from "@/app/components/ui/floating-navbar"

import {
    IconHome,
    IconCode,
    IconTemplate,
    IconFileCode,
    IconUpload,
    IconFolderPlus,
    IconCloudUpload,
    IconCopy,
    IconCloudDownload,
    IconGitCommit,
    IconGitMerge,
    IconHistory,
    IconGitBranch,
    IconGitFork,
    IconGitPullRequest,
    IconPlayerPlayFilled,
} from "@tabler/icons-react"

interface File {
    filename: string
    contents: string
}

interface CppProject {
    projectName: string
    files: File[]
    timestamp: string
    totalFiles: number
    cppFiles: number
}

// Enhanced localStorage manager that only returns C++ files for repo operations
const localStorageManager = {
    getAllCppProjects: (): CppProject[] => {
        if (typeof window === "undefined") return []

        const projects: CppProject[] = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith("cpp_project_")) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || "{}")
                    if (data.files && Array.isArray(data.files)) {
                        // Filter only C++ files for the repo page
                        const cppFiles = data.files.filter((file: File) =>
                            file.filename.endsWith(".cpp") ||
                            file.filename.endsWith(".c") ||
                            file.filename.endsWith(".h") ||
                            file.filename.endsWith(".hpp")
                        )
                        if (cppFiles.length > 0) {
                            projects.push({
                                projectName: data.project || key.replace("cpp_project_", ""),
                                files: cppFiles,
                                timestamp: data.timestamp,
                                totalFiles: data.files.length,
                                cppFiles: cppFiles.length,
                            })
                        }
                    }
                } catch (error) {
                    console.error(`Error parsing project ${key}:`, error)
                }
            }
        }
        return projects.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    },
}

export default function Page() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: session } = useSession()

    // State for IDE integration
    const [cppProjects, setCppProjects] = useState<CppProject[]>([])
    const [selectedProject, setSelectedProject] = useState<CppProject | null>(null)
    const [activeFile, setActiveFile] = useState<File | null>(null)

    // User state
    const [signedIn, setSignedIn] = useState(false)
    const [name, setName] = useState("")
    const [githubUsername, setGithubUsername] = useState("")
    const [githubToken, setGithubToken] = useState("")

    // Loading states for UI feedback
    const [isSavingProject, setIsSavingProject] = useState(false)
    const [isCreatingRepo, setIsCreatingRepo] = useState(false)
    const [isPushing, setIsPushing] = useState(false)
    const [isCloning, setIsCloning] = useState(false)
    const [createdRepos, setCreatedRepos] = useState<{ owner: string; name: string }[]>([])

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load projects from localStorage
    const loadCppProjects = () => {
        const projects = localStorageManager.getAllCppProjects()
        setCppProjects(projects)

        // Auto-select first project if none selected
        if (projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0])
            if (projects[0].files.length > 0) {
                setActiveFile(projects[0].files[0])
            }
        }
    }

    // Initialize session and load project data
    useEffect(() => {
        const loadInitialData = async () => {
            if (session?.user?.role === "student" || session?.user?.role === "educator") {
                setSignedIn(true)

                // Get GitHub info from session
                if (session.user.name) {
                    setName(session.user.name)
                }

                // Extract GitHub username from session or email
                if (session.user.email) {
                    const emailPrefix = session.user.email.split("@")[0]
                    setGithubUsername(emailPrefix)
                }

                // Get GitHub token from session if available
                if (session.accessToken) {
                    setGithubToken(session.accessToken)
                }

                // Fetch student info for more details
                try {
                    const studentInfoResponse = await fetch("/api/student/get_studentinfo/post", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                    })
                    const studentInfoData = await studentInfoResponse.json()
                    if (studentInfoData.firstname && studentInfoData.lastname) {
                        setName(studentInfoData.firstname + " " + studentInfoData.lastname)
                    }
                } catch (error) {
                    console.error("Failed to fetch student info:", error)
                }
            }
        }

        loadInitialData()
        loadCppProjects()
    }, [session])

    // Listen for updates from the C++ IDE
    useEffect(() => {
        const handleCppProjectSaved = (event: CustomEvent) => {
            console.log("C++ project saved:", event.detail)
            loadCppProjects()
        }

        // Listen for custom events from the IDE
        window.addEventListener("cppProjectSaved", handleCppProjectSaved as EventListener)

        // Also refresh on storage events
        const handleStorageChange = () => {
            loadCppProjects()
        }

        window.addEventListener("storage", handleStorageChange)

        // Refresh projects every 5 seconds to catch auto-saves
        const refreshInterval = setInterval(loadCppProjects, 5000)

        return () => {
            window.removeEventListener("cppProjectSaved", handleCppProjectSaved as EventListener)
            window.removeEventListener("storage", handleStorageChange)
            clearInterval(refreshInterval)
        }
    }, [])

    // Dynamic GitHub functionality using user's account
    const createRepo = async (repoName: string) => {
        if (!githubToken) {
            alert("GitHub authentication required. Please sign in with GitHub.")
            return null
        }

        setIsCreatingRepo(true)
        try {
            const res = await fetch("https://api.github.com/user/repos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `token ${githubToken}`,
                    Accept: "application/vnd.github.v3+json",
                },
                body: JSON.stringify({
                    name: repoName.trim(),
                    description: `Created via SchoolNest C++ IDE - ${selectedProject?.projectName || "C++ Project"}`,
                    private: false,
                    auto_init: true,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                if (data.errors?.some((e: any) => e.message?.includes("already exists"))) {
                    alert("Repository name already exists. Please choose a different name.")
                } else {
                    alert("Failed to create repo: " + (data.message || data.error || "Unknown error"))
                }
                return null
            }

            alert(`Repository "${repoName}" created successfully on your GitHub account!`)
            return data
        } catch (error) {
            console.error("Network or unexpected error creating repo:", error)
            alert("Error creating repository. Please check your connection and GitHub authentication.")
            return null
        } finally {
            setIsCreatingRepo(false)
        }
    }

    const handlePush = async (owner: string, repo: string) => {
        if (!githubToken) {
            alert("GitHub authentication required. Please sign in with GitHub.")
            return
        }

        if (!activeFile) {
            alert("No file selected for push.")
            return
        }

        setIsPushing(true)
        try {
            // First, get the current file SHA if it exists
            let sha = null
            try {
                const getFileRes = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${activeFile.filename}`,
                    {
                        headers: {
                            Authorization: `token ${githubToken}`,
                            Accept: "application/vnd.github.v3+json",
                        },
                    },
                )
                if (getFileRes.ok) {
                    const fileData = await getFileRes.json()
                    sha = fileData.sha
                }
            } catch (e) {
                // File doesn't exist yet, which is fine
            }

            // Push the file
            const pushData: any = {
                message: `Update ${activeFile.filename} via SchoolNest C++ IDE`,
                content: btoa(activeFile.contents), // Base64 encode
            }

            if (sha) {
                pushData.sha = sha // Required for updates
            }

            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${activeFile.filename}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `token ${githubToken}`,
                    Accept: "application/vnd.github.v3+json",
                },
                body: JSON.stringify(pushData),
            })

            if (!res.ok) {
                const errorData = await res.json()
                alert("Push failed: " + (errorData.message || "Unknown error"))
            } else {
                alert(`File "${activeFile.filename}" pushed successfully to ${owner}/${repo}!`)
            }
        } catch (error) {
            console.error("Network or unexpected error during push:", error)
            alert("Error pushing file. Please check your connection.")
        } finally {
            setIsPushing(false)
        }
    }

    const handleCreateAndPush = async () => {
        if (!selectedProject || selectedProject.files.length === 0) {
            alert("No C++ files to push. Please select a project with C++ files first.")
            return
        }

        if (!githubUsername) {
            alert("GitHub username not available. Please ensure you're signed in with GitHub.")
            return
        }

        let chosenRepo: { owner: string; name: string } | null = null

        if (createdRepos.length > 0) {
            const repoNames = createdRepos.map((r, i) => `${i + 1}: ${r.name}`).join("\n")
            const input = prompt(
                `You have created these repositories this session:\n${repoNames}\n\n` +
                `Enter the number of the repo to push to, or leave empty to create a new repo:`,
            )

            if (input) {
                const index = Number.parseInt(input, 10) - 1
                if (!isNaN(index) && createdRepos[index]) {
                    chosenRepo = createdRepos[index]
                } else {
                    alert("Invalid selection, creating a new repo.")
                }
            }
        }

        if (!chosenRepo) {
            const repoNameInput = prompt(`Enter new repository name for project "${selectedProject.projectName}":`)
            if (!repoNameInput || repoNameInput.trim() === "") {
                alert("Repository name is required.")
                return
            }

            const newRepo = await createRepo(repoNameInput)
            if (!newRepo) return

            chosenRepo = { owner: newRepo.owner.login, name: newRepo.name }
            setCreatedRepos((prev) => [...prev, chosenRepo!])
        }

        if (chosenRepo && activeFile) {
            await handlePush(chosenRepo.owner, chosenRepo.name)
        }
    }

    // File upload functionality
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith(".cpp") && !file.name.endsWith(".c") && !file.name.endsWith(".h") && !file.name.endsWith(".hpp")) {
            alert("Only C++ files (.cpp, .c, .h, .hpp) are supported in the repository manager.")
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            const contents = e.target?.result as string
            const newFile: File = {
                filename: file.name,
                contents,
            }

            // Add to selected project or create new project
            if (selectedProject) {
                const updatedProject = {
                    ...selectedProject,
                    files: [...selectedProject.files, newFile],
                    cppFiles: selectedProject.cppFiles + 1,
                }
                setSelectedProject(updatedProject)
            }

            setActiveFile(newFile)
            alert(`C++ file "${file.name}" uploaded successfully!`)
        }
        reader.readAsText(file)
    }

    // Get file statistics for dynamic display
    const getFileStats = () => {
        if (!selectedProject) {
            return {
                totalFiles: 0,
                cppFiles: 0,
                totalLines: 0,
                avgLinesPerFile: 0,
            }
        }

        const totalLines = selectedProject.files.reduce((acc, file) => acc + file.contents.split("\n").length, 0)
        const avgLinesPerFile = selectedProject.files.length > 0 ? Math.round(totalLines / selectedProject.files.length) : 0

        return {
            totalFiles: selectedProject.totalFiles,
            cppFiles: selectedProject.cppFiles,
            totalLines,
            avgLinesPerFile,
        }
    }

    const fileStats = getFileStats()

    const handleGitOperation = async (operationName: string) => {
        switch (operationName) {
            case "Clone Repository":
                setIsCloning(true)
                const cloneUrl = prompt("Enter repository URL to clone:")
                if (cloneUrl) {
                    alert(`Cloning ${cloneUrl}... This would be implemented with backend integration.`)
                }
                setIsCloning(false)
                break
            case "Create Repository":
                if (!selectedProject) {
                    alert("Please select a project first.")
                    return
                }
                const newRepoName = prompt(`Enter repository name for project "${selectedProject.projectName}":`)
                if (newRepoName && newRepoName.trim() !== "") {
                    const repo = await createRepo(newRepoName)
                    if (repo) {
                        setCreatedRepos((prev) => [...prev, { owner: repo.owner.login, name: repo.name }])
                    }
                } else {
                    alert("Repository name cannot be empty.")
                }
                break
            case "Push Changes":
                if (!selectedProject || selectedProject.files.length === 0) {
                    alert("No C++ files to push. Please select a project with C++ files first.")
                    return
                }
                await handleCreateAndPush()
                break
            case "Upload File":
                fileInputRef.current?.click()
                break
            case "Pull Changes":
            case "Commit Changes":
            case "Merge Branches":
            case "Rebase":
            case "Create Branch":
            case "Fork Repository":
            case "Pull Request":
                router.push(`/studenthome/git/terminal?operation=${encodeURIComponent(operationName)}`)
                break
            default:
                alert(`Operation "${operationName}" not implemented directly here.`)
        }
    }

    interface GitOperationCardProps {
        title: string
        description: string
        icon: React.ReactElement
        color?: string
        command?: string
        isSpecial?: boolean
        isLoading?: boolean
    }

    const GitOperationCard = ({
                                  title,
                                  description,
                                  icon,
                                  color = "blue",
                                  command,
                                  isSpecial = false,
                                  isLoading = false,
                              }: GitOperationCardProps) => {
        return (
            <div
                className={`w-full h-full bg-black border border-${color}-500/30 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-${color}-500/20 transition-all duration-300 hover:scale-[1.02] overflow-hidden hover:border-${color}-400/50`}
            >
                <div className="p-6 h-full flex flex-col">
                    {/* Header */}
                    <div className={`flex items-center gap-3 mb-4 text-${color}-400`}>
                        {icon}
                        <h3 className={`text-lg font-semibold text-${color}-300`}>{title}</h3>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-blue-200 leading-relaxed mb-4 flex-1">{description}</p>

                    {/* Command */}
                    {command && (
                        <div className="bg-gray-900/70 rounded-lg p-3 border border-blue-500/30 mb-4">
                            <code className="text-xs text-cyan-400 font-mono">{command}</code>
                        </div>
                    )}

                    {/* Dynamic file info for special operations */}
                    {isSpecial && selectedProject && (
                        <div className={`bg-${color}-900/20 rounded-lg p-3 border border-${color}-500/30 mb-4`}>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className={`text-${color}-300`}>
                                        <span className="font-medium">Project:</span> {selectedProject.projectName}
                                    </div>
                                    <div className={`text-${color}-300`}>
                                        <span className="font-medium">C++ Files:</span> {fileStats.cppFiles}
                                    </div>
                                    <div className={`text-${color}-300`}>
                                        <span className="font-medium">Total Lines:</span> {fileStats.totalLines}
                                    </div>
                                    <div className={`text-${color}-300`}>
                                        <span className="font-medium">Avg Lines:</span> {fileStats.avgLinesPerFile}
                                    </div>
                                </div>
                                {selectedProject.files.length > 0 && (
                                    <div className={`text-xs text-${color}-400 max-h-16 overflow-y-auto`}>
                                        <span className="font-medium">Files:</span>{" "}
                                        {selectedProject.files.map((f) => f.filename).join(", ")}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Execute Button */}
                    <div className="mt-auto pt-4 border-t border-blue-500/20">
                        <Button
                            onClick={() => handleGitOperation(title)}
                            disabled={isLoading}
                            className={`w-full bg-gradient-to-r from-${color}-600 to-${color}-800 hover:from-${color}-500 hover:to-${color}-700 text-white font-medium rounded-lg px-4 py-2.5 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-${color}-500/25 border border-${color}-500/30`}
                        >
                            {isLoading ? (
                                <span className="animate-spin h-4 w-4 border-2 border-current border-r-transparent rounded-full"></span>
                            ) : (
                                <IconPlayerPlayFilled className="h-4 w-4" />
                            )}
                            {isLoading ? "Executing..." : "Execute"}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const links = [
        {
            title: "Home",
            icon: <IconHome className="h-full w-full text-blue-400 dark:text-blue-300" />,
            href: "/studenthome",
        },
        {
            title: "Dashboard",
            icon: <IconCode className="h-full w-full text-blue-400 dark:text-blue-300" />,
            href: "/studenthome/cpp",
        },
        {
            title: "C++ IDE",
            icon: <IconTemplate className="h-full w-full text-blue-400 dark:text-blue-300" />,
            href: "/studenthome/cpp/ide",
        },
        {
            title: "Classes",
            icon: <IconGitBranch className="h-full w-full text-blue-400 dark:text-blue-300" />,
            href: "/studenthome/classes",
        },
        {
            title: "Terminal",
            icon: <IconFileCode className="h-full w-full text-blue-400 dark:text-blue-300" />,
            href: "/studenthome/linux",
        },
    ]

    const gitOperations = [
        {
            title: "Upload File",
            description: `Upload C++ files from your computer. Currently ${fileStats.cppFiles} C++ files loaded from local storage.`,
            icon: <IconUpload className="h-6 w-6" />,
            color: "blue",
            command: `Upload .cpp/.c/.h files • Current: ${fileStats.cppFiles} C++ files`,
            isSpecial: true,
            isLoading: false,
        },
        {
            title: "Create Repository",
            description: `Initialize a new Git repository on your GitHub account (@${githubUsername}) for your ${fileStats.cppFiles} C++ files.`,
            icon: <IconFolderPlus className="h-6 w-6" />,
            color: "purple",
            command: `Create GitHub repo for ${githubUsername} with ${fileStats.cppFiles} C++ files`,
            isSpecial: true,
            isLoading: isCreatingRepo,
        },
        {
            title: "Push Changes",
            description: `Upload your ${fileStats.cppFiles} C++ files (${fileStats.totalLines} total lines) to your GitHub repository.`,
            icon: <IconCloudUpload className="h-6 w-6" />,
            color: "orange",
            command: `git push ${fileStats.cppFiles} C++ files with ${fileStats.totalLines} lines`,
            isSpecial: true,
            isLoading: isPushing,
        },
        {
            title: "Clone Repository",
            description:
                "Create a local copy of a remote repository on your machine. This downloads all files, branches, and commit history.",
            icon: <IconCopy className="h-6 w-6" />,
            color: "cyan",
            command: "git clone <repository-url>",
            isLoading: isCloning,
        },
        {
            title: "Pull Changes",
            description:
                "Download and merge changes from a remote repository into your current branch. Stay synchronized with team updates.",
            icon: <IconCloudDownload className="h-6 w-6" />,
            color: "teal",
            command: "git pull origin main",
        },
        {
            title: "Commit Changes",
            description:
                "Save your staged changes to the repository with a descriptive message. Create a snapshot of your project's current state.",
            icon: <IconGitCommit className="h-6 w-6" />,
            color: "emerald",
            command: 'git commit -m "Your message"',
        },
        {
            title: "Merge Branches",
            description:
                "Combine changes from different branches into one. Integrate feature branches back into your main development line.",
            icon: <IconGitMerge className="h-6 w-6" />,
            color: "violet",
            command: "git merge feature-branch",
        },
        {
            title: "Rebase",
            description:
                "Reapply commits on top of another base tip. Clean up commit history and create a linear project timeline.",
            icon: <IconHistory className="h-6 w-6" />,
            color: "indigo",
            command: "git rebase main",
        },
        {
            title: "Create Branch",
            description:
                "Create a new branch for feature development or experimentation. Work on isolated changes without affecting main code.",
            icon: <IconGitBranch className="h-6 w-6" />,
            color: "sky",
            command: "git checkout -b new-branch",
        },
        {
            title: "Fork Repository",
            description:
                "Create a personal copy of someone else's repository. Contribute to open source projects or customize existing code.",
            icon: <IconGitFork className="h-6 w-6" />,
            color: "pink",
            command: "Fork via GitHub UI",
        },
        {
            title: "Pull Request",
            description:
                "Propose changes to a repository by requesting that your changes be pulled into the main branch. Collaborate and review code.",
            icon: <IconGitPullRequest className="h-6 w-6" />,
            color: "rose",
            command: "Create via GitHub UI",
        },
    ]

    const items = gitOperations.map((operation) => ({
        title: "",
        description: "",
        header: <GitOperationCard {...operation} />,
        className: "md:col-span-1",
        icon: null,
    }))

    return (
        <>
            <FloatingNav />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} accept=".cpp,.c,.h,.hpp" />

            <div className="min-h-screen w-full bg-black relative flex flex-col items-center antialiased">
                {/* Hero Section */}
                <BackgroundLines className="flex items-center justify-center w-full flex-col px-4 py-20 bg-black">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2 mb-6">
                            <IconGitBranch className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-blue-300 font-medium">Version Control</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-b from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-6">
                            C++ Repository
                        </h1>

                        <p className="text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed mb-4">
                            Master Git operations and repository management with integrated C++ file handling. Access your C++
                            IDE projects and push code to your GitHub account.
                        </p>

                        {/* Project Selector */}
                        {cppProjects.length > 0 && (
                            <div className="mb-6">
                                <select
                                    value={selectedProject?.projectName || ""}
                                    onChange={(e) => {
                                        const project = cppProjects.find((p) => p.projectName === e.target.value)
                                        setSelectedProject(project || null)
                                        if (project && project.files.length > 0) {
                                            setActiveFile(project.files[0])
                                        }
                                    }}
                                    className="bg-gray-900/80 border border-blue-500/30 rounded-lg px-4 py-2 text-blue-200 backdrop-blur-sm"
                                >
                                    <option value="">Select a C++ project...</option>
                                    {cppProjects.map((project) => (
                                        <option key={project.projectName} value={project.projectName}>
                                            {project.projectName} ({project.cppFiles} C++ files)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {signedIn && selectedProject && (
                            <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-blue-500/30 backdrop-blur-sm">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="text-blue-400 font-bold text-lg">{fileStats.totalFiles}</div>
                                        <div className="text-blue-300">Total Files</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-green-400 font-bold text-lg">{fileStats.cppFiles}</div>
                                        <div className="text-green-300">C++ Files</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-purple-400 font-bold text-lg">{fileStats.totalLines}</div>
                                        <div className="text-purple-300">Total Lines</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-cyan-400 font-bold text-lg">{cppProjects.length}</div>
                                        <div className="text-cyan-300">Projects</div>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-blue-500/20 text-center">
                                    <p className="text-sm text-blue-300">
                                        Welcome, <span className="text-blue-400 font-medium">{name}</span>
                                        {githubUsername && (
                                            <>
                                                {" "}
                                                • GitHub: <span className="text-green-400 font-medium">@{githubUsername}</span>
                                            </>
                                        )}
                                        {selectedProject && (
                                            <>
                                                {" "}
                                                • Project: <span className="text-purple-400 font-medium">{selectedProject.projectName}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* File Selector */}
                        {selectedProject && selectedProject.files.length > 0 && (
                            <div className="mb-6">
                                <select
                                    value={activeFile?.filename || ""}
                                    onChange={(e) => {
                                        const file = selectedProject.files.find((f) => f.filename === e.target.value)
                                        setActiveFile(file || null)
                                    }}
                                    className="bg-gray-900/80 border border-blue-500/30 rounded-lg px-4 py-2 text-blue-200 backdrop-blur-sm"
                                >
                                    <option value="">Select a C++ file...</option>
                                    {selectedProject.files.map((file) => (
                                        <option key={file.filename} value={file.filename}>
                                            {file.filename} ({file.contents.split("\n").length} lines)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-4 text-sm text-blue-400">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span>Git Ready</span>
                            </div>
                            <div className="w-px h-4 bg-blue-600"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>C++ Files</span>
                            </div>
                            <div className="w-px h-4 bg-blue-600"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                <span>GitHub Integration</span>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <div className="flex justify-center mt-12">
                            <div className="flex space-x-4 p-4 bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-blue-500/30 shadow-2xl">
                                {links.map((link, index) => (
                                    <div key={index} className="relative group">
                                        <Link
                                            href={link.href}
                                            className="flex items-center justify-center w-14 h-14 bg-black/70 backdrop-blur-sm hover:bg-gray-800/90 rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-2 border border-blue-500/30 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
                                        >
                                            {React.cloneElement(link.icon, {
                                                className: "h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-200",
                                            })}
                                        </Link>

                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-blue-200 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 pointer-events-none border border-blue-500/30 shadow-xl">
                                            {link.title}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </BackgroundLines>

                {/* Git Operations Grid */}
                <div className="w-full max-w-7xl mx-auto px-6 pb-32 bg-black">
                    <BentoGrid className="md:auto-rows-auto gap-6">
                        {items.map((item, i) => (
                            <BentoGridItem
                                key={i}
                                title={item.title}
                                description={item.description}
                                header={item.header}
                                className={`${item.className} bg-transparent border-0 p-0 overflow-visible`}
                                icon={item.icon}
                            />
                        ))}
                    </BentoGrid>
                </div>
            </div>
        </>
    )
}
