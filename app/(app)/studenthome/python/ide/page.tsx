"use client"

import { Sidebar, SidebarBody, SidebarLink } from "@/app/components/ui/sidebar"
import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import {
    IconArrowLeft,
    IconBrandTabler,
    IconSettings,
    IconUserBolt,
    IconPackage,
    IconTemplate,
    IconBrandPython,
    IconFolderDown,
    IconLoader,
    IconFileDownload,
    IconUpload,
    IconPlayerPlayFilled,
    IconCloudUpload,
    IconBrandGithub,
    IconTrash,
    IconPlayerStop,
    IconCode,
} from "@tabler/icons-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import Script from "next/script"
import { useSearchParams, useRouter } from "next/navigation"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { Code, Edit3, Play, CloudDownloadIcon as IconCloudDownload } from "lucide-react"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

interface File {
    filename: string
    contents: string
}

interface Project {
    project_name: string
    files: File[]
}

interface OutputItem {
    text: string
    type: "output" | "error" | "system" | "input"
    timestamp: string
}

// Enhanced localStorage management with proper .py file handling
const localStorageManager = {
    getItem: (key: string) => {
        if (typeof window !== "undefined") {
            return localStorage.getItem(key)
        }
        return null
    },
    setItem: (key: string, value: string) => {
        if (typeof window !== "undefined") {
            localStorage.setItem(key, value)
        }
        console.log(`Saved to localStorage: ${key}`)
    },
    removeItem: (key: string) => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(key)
        }
        console.log(`Removed from localStorage: ${key}`)
    },
    // Get all Python projects from localStorage
    getAllPythonProjects: () => {
        if (typeof window === "undefined") return []

        const projects = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith("python_project_")) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || "{}")
                    if (data.files && Array.isArray(data.files)) {
                        // Filter only .py files for the repo page
                        const pythonFiles = data.files.filter((file: File) => file.filename.endsWith(".py"))
                        if (pythonFiles.length > 0) {
                            projects.push({
                                projectName: data.project || key.replace("python_project_", ""),
                                files: pythonFiles,
                                timestamp: data.timestamp,
                                totalFiles: data.files.length,
                                pythonFiles: pythonFiles.length,
                            })
                        }
                    }
                } catch (error) {
                    console.error(`Error parsing project ${key}:`, error)
                }
            }
        }
        return projects
    },
}

export default function PythonIDE() {
    // File and project management
    const [files, setFiles] = useState<File[]>([
        {
            filename: "main.py",
            contents: `# Welcome to Python IDE
print("Hello, World!")

# You can import other files when you create them
# from utils import helper_function
`,
        },
    ])

    const [activeFile, setActiveFile] = useState("main.py")
    const [output, setOutput] = useState<OutputItem[]>([])
    const [isRunning, setIsRunning] = useState(false)

    // Input handling
    const [isWaitingForInput, setIsWaitingForInput] = useState(false)
    const [inputPrompt, setInputPrompt] = useState("")
    const [userInput, setUserInput] = useState("")
    const [inputResolver, setInputResolver] = useState<((value: string) => void) | null>(null)

    // Pyodide
    const [pyodide, setPyodide] = useState<any>(null)
    const [isExecuting, setIsExecuting] = useState(false)

    // UI state
    const [sidebarWidth, setSidebarWidth] = useState(300)
    const [outputHeight, setOutputHeight] = useState(200)
    const [open, setOpen] = useState(false)

    // Project management
    const [currentProject, setCurrentProject] = useState("My Project")
    const [projectList, setProjectList] = useState<string[]>(["My Project"])

    // Save management states
    const [isSavedToLocalStorage, setIsSavedToLocalStorage] = useState(true)
    const [isSavedToDatabase, setIsSavedToDatabase] = useState(true)
    const [lastLocalStorageSave, setLastLocalStorageSave] = useState<string>("")
    const [lastAutoSave, setLastAutoSave] = useState<string>("")

    // Session management
    const [signedIn, setSignedIn] = useState(false)
    const [name, setName] = useState("")
    const [githubToken, setGithubToken] = useState<string>("")
    const { data: session } = useSession()
    const searchParams = useSearchParams()
    const router = useRouter()

    // Refs
    const outputRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const monacoEditorRef = useRef<any>(null)
    const isResizing = useRef(false)
    const isResizingOutput = useRef(false)
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Initialize session and GitHub token
    useEffect(() => {
        if (session && (session.user.role === "student" || session.user.role === "educator")) {
            setSignedIn(true)
            setName(session.user.name || "User")

            // Get GitHub token from session if available
            if (session.accessToken) {
                setGithubToken(session.accessToken)
            }

            loadUserProjects()
        }
    }, [session])

    // Initialize Pyodide
    useEffect(() => {
        const initPyodide = async () => {
            try {
                if (typeof window !== "undefined" && (window as any).loadPyodide) {
                    addToOutput("Initializing Python environment...", "system")
                    const pyodideInstance = await (window as any).loadPyodide()

                    // Load common packages
                    await pyodideInstance.loadPackage(["numpy", "matplotlib"])

                    // Setup custom input/output handling
                    setupPyodideIO(pyodideInstance)

                    setPyodide(pyodideInstance)
                    addToOutput("Python environment ready!", "system")
                }
            } catch (error) {
                addToOutput(`Failed to initialize Python: ${error}`, "error")
            }
        }

        initPyodide()
    }, [])

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
    }, [output])

    // Focus input when waiting
    useEffect(() => {
        if (isWaitingForInput && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isWaitingForInput])

    // Load project from localStorage on mount
    useEffect(() => {
        loadFromLocalStorage()
    }, [currentProject])

    // Utility functions
    const addToOutput = (text: string, type: OutputItem["type"] = "output") => {
        setOutput((prev) => [
            ...prev,
            {
                text,
                type,
                timestamp: new Date().toLocaleTimeString(),
            },
        ])
    }

    const clearOutput = () => {
        setOutput([])
    }

    const getActiveFileContent = () => {
        return files.find((f) => f.filename === activeFile)?.contents || ""
    }

    // Setup Pyodide input/output
    const setupPyodideIO = (pyodideInstance: any) => {
        ;(window as any).pythonInputPromise = null
        ;(window as any).pythonInputResolver = null
        ;(window as any).addPythonOutput = (text: string, outputType: string) => {
            if (text.trim() || outputType === "stdout") {
                addToOutput(text, outputType === "stderr" ? "error" : "output")
            }
        }
        ;(window as any).pythonInput = (prompt = "") => {
            return new Promise<string>((resolve) => {
                if (prompt) {
                    addToOutput(prompt, "output")
                }

                setInputPrompt(prompt)
                setInputResolver(() => resolve)
                setIsWaitingForInput(true)
                ;(window as any).pythonInputResolver = resolve
            })
        }

        pyodideInstance.runPython(`
import sys
import asyncio
from js import pythonInput, addPythonOutput

class PythonOutput:
    def __init__(self, output_type='stdout'):
        self.output_type = output_type
        self.buffer = ""

    def write(self, text):
        if text:
            self.buffer += text
            if '\\n' in text or text.endswith('\\n'):
                lines = self.buffer.split('\\n')
                for i, line in enumerate(lines[:-1]):
                    if line or i == 0:
                        addPythonOutput(line, self.output_type)
                self.buffer = lines[-1]
            elif len(self.buffer) > 100:
                addPythonOutput(self.buffer, self.output_type)
                self.buffer = ""

    def flush(self):
        if self.buffer:
            addPythonOutput(self.buffer, self.output_type)
            self.buffer = ""

sys.stdout = PythonOutput('stdout')
sys.stderr = PythonOutput('stderr')

def sync_input(prompt=""):
    async def _async_input():
        try:
            result = await pythonInput(str(prompt))
            return result
        except Exception as e:
            print(f"Input error: {e}")
            return ""
    
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            task = asyncio.create_task(_async_input())
            return task
        else:
            return loop.run_until_complete(_async_input())
    except:
        return _async_input()

setattr(__builtins__, "input", sync_input)

def test_io():
    print("I/O system initialized successfully")
        `)
    }

    // File management functions
    const updateFileContent = (content: string) => {
        setFiles((prev) => prev.map((f) => (f.filename === activeFile ? { ...f, contents: content } : f)))
        setIsSavedToLocalStorage(false)
        setIsSavedToDatabase(false)
    }

    const addFile = () => {
        const baseName = "script"
        const extension = ".py"
        let maxSuffix = 0

        files.forEach((f) => {
            const match = f.filename.match(/^script(\d*)\.py$/)
            if (match) {
                const suffix = match[1] ? Number.parseInt(match[1], 10) : 0
                if (suffix >= maxSuffix) {
                    maxSuffix = suffix + 1
                }
            }
        })

        const newFileName = `${baseName}${maxSuffix === 0 ? "" : maxSuffix}${extension}`
        const newFile: File = {
            filename: newFileName,
            contents: "# New Python file\n",
        }

        setFiles((prev) => [...prev, newFile])
        setActiveFile(newFileName)
        setIsSavedToLocalStorage(false)
        setIsSavedToDatabase(false)
    }

    const removeFile = (fileName: string) => {
        if (files.length <= 1) {
            addToOutput("Cannot delete the last file", "error")
            return
        }

        const newFiles = files.filter((f) => f.filename !== fileName)
        setFiles(newFiles)
        if (activeFile === fileName && newFiles.length > 0) {
            setActiveFile(newFiles[0].filename)
        }
        addToOutput("File deleted", "system")
        setIsSavedToLocalStorage(false)
        setIsSavedToDatabase(false)
    }

    const renameFile = (oldFileName: string, newFileName: string) => {
        if (!newFileName.trim()) return
        if (files.some((f) => f.filename === newFileName)) {
            alert("A file with that name already exists.")
            return
        }

        const updatedFiles = files.map((f) => (f.filename === oldFileName ? { ...f, filename: newFileName } : f))
        setFiles(updatedFiles)
        if (activeFile === oldFileName) {
            setActiveFile(newFileName)
        }
        setIsSavedToLocalStorage(false)
        setIsSavedToDatabase(false)
    }

    // Enhanced save management functions
    const saveToLocalStorage = useCallback(() => {
        const saveData = {
            project: currentProject,
            files: files,
            timestamp: new Date().toISOString(),
            activeFile,
        }

        const saveKey = `python_project_${currentProject}`
        localStorageManager.setItem(saveKey, JSON.stringify(saveData))

        setIsSavedToLocalStorage(true)
        setLastLocalStorageSave(new Date().toISOString())

        // Dispatch custom event to notify repo page of updates
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("pythonProjectSaved", {
                    detail: { project: currentProject, files: files.filter((f) => f.filename.endsWith(".py")) },
                }),
            )
        }

        return true
    }, [files, currentProject, activeFile])

    const loadFromLocalStorage = useCallback(() => {
        const saveKey = `python_project_${currentProject}`
        const savedData = localStorageManager.getItem(saveKey)

        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData)
                if (parsedData.files && Array.isArray(parsedData.files)) {
                    setFiles(parsedData.files)
                    if (parsedData.activeFile) {
                        setActiveFile(parsedData.activeFile)
                    }
                    setLastLocalStorageSave(parsedData.timestamp || "")
                    setIsSavedToLocalStorage(true)

                    addToOutput(
                        `✓ Project loaded from local storage (saved: ${new Date(parsedData.timestamp).toLocaleTimeString()})`,
                        "system",
                    )
                    return true
                }
            } catch (error) {
                console.error("Error loading from localStorage:", error)
            }
        }
        return false
    }, [currentProject])

    const saveProject = async () => {
        try {
            // Save locally first
            const localSaveSuccess = saveToLocalStorage()

            if (!localSaveSuccess) {
                addToOutput("✗ Failed to save to local storage", "error")
                return
            }

            addToOutput(`✓ Project saved to local storage at ${new Date().toLocaleTimeString()}`, "system")

            if (signedIn) {
                const response = await fetch("/api/student/save_files/post", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        project: currentProject,
                        files: files.map((f) => ({
                            filename: f.filename,
                            contents: f.contents,
                        })),
                    }),
                })

                if (response.ok) {
                    const fileCount = files.length
                    const totalLines = files.reduce((acc, file) => acc + file.contents.split("\n").length, 0)

                    setIsSavedToDatabase(true)
                    addToOutput(
                        `✓ Project saved to database at ${new Date().toLocaleTimeString()} | Files: ${fileCount} | Total Lines: ${totalLines}`,
                        "system",
                    )
                } else {
                    throw new Error("Database save failed")
                }
            }
        } catch (error: any) {
            addToOutput(`✗ Failed to save to database: ${error.message}`, "error")
        }
    }

    const loadUserProjects = async () => {
        try {
            if (signedIn) {
                const response = await fetch("/api/student/get_projectlist/post", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                })
                const data = await response.json()
                if (data.python_project_names) {
                    setProjectList(data.python_project_names)
                }
            }
        } catch (error) {
            console.error("Failed to load projects:", error)
        }
    }

    // File upload/export functions
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.name.endsWith(".zip")) {
            try {
                const zip = await JSZip.loadAsync(file)
                const filesArray: File[] = []

                await Promise.all(
                    Object.keys(zip.files).map(async (filename) => {
                        const zipEntry = zip.files[filename]
                        if (!zipEntry.dir) {
                            const content = await zipEntry.async("string")
                            filesArray.push({ filename, contents: content })
                        }
                    }),
                )

                setFiles((prev) => [...prev, ...filesArray])
                if (filesArray.length > 0) {
                    setActiveFile(filesArray[0].filename)
                }
                addToOutput(`Imported ${filesArray.length} files from ZIP`, "system")
            } catch (err) {
                addToOutput("Failed to read ZIP file", "error")
            }
        } else {
            const reader = new FileReader()
            reader.onload = (e) => {
                const contents = e.target?.result as string
                const newFile = { filename: file.name, contents }
                setFiles((prev) => [...prev, newFile])
                setActiveFile(file.name)
                addToOutput(`File "${file.name}" uploaded`, "system")
            }
            reader.readAsText(file)
        }
        setIsSavedToLocalStorage(false)
        setIsSavedToDatabase(false)
    }

    const handleExport = async () => {
        if (files.length === 1) {
            const file = files[0]
            const blob = new Blob([file.contents], { type: "text/x-python" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = file.filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            addToOutput(`File exported as ${file.filename}`, "system")
        } else {
            const zip = new JSZip()
            files.forEach((file) => {
                zip.file(file.filename, file.contents)
            })
            const blob = await zip.generateAsync({ type: "blob" })
            saveAs(blob, `${currentProject}.zip`)
            addToOutput(`Project exported as ${currentProject}.zip`, "system")
        }
    }

    // Code execution
    const runCode = async () => {
        if (!pyodide) {
            addToOutput("Python environment not ready yet...", "error")
            return
        }

        if (isExecuting) {
            addToOutput("Code is already running...", "error")
            return
        }

        const activeFileContent = getActiveFileContent()
        if (!activeFileContent) {
            addToOutput("No active file to run", "error")
            return
        }

        setIsRunning(true)
        setIsExecuting(true)
        addToOutput(`Running ${activeFile}...`, "system")

        try {
            setIsWaitingForInput(false)
            setInputResolver(null)

            // Clear previous modules
            try {
                pyodide.runPython(`
import sys
modules_to_remove = []
for module_name in sys.modules:
    if not module_name.startswith('_') and module_name not in [
        'sys', 'os', 'builtins', 'asyncio', 'typing', 'collections',
        'functools', 'operator', 'itertools', 'math', 'random'
    ]:
        module = sys.modules[module_name]
        if hasattr(module, '__file__') and module.__file__:
            if not module.__file__.startswith('/lib/python'):
                modules_to_remove.append(module_name)

for module_name in modules_to_remove:
    try:
        del sys.modules[module_name]
    except:
        pass
                `)
            } catch (e) {
                // Ignore cleanup errors
            }

            // Create virtual files for all Python files
            for (const file of files) {
                if (file.filename.endsWith(".py")) {
                    pyodide.FS.writeFile(`/${file.filename}`, file.contents)
                }
            }

            // Add current directory to Python path
            pyodide.runPython(`
import sys
if '/' not in sys.path:
    sys.path.insert(0, '/')
            `)

            // Execute the code
            await pyodide.runPythonAsync(activeFileContent)

            // Flush any remaining output
            pyodide.runPython(`
import sys
sys.stdout.flush()
sys.stderr.flush()
            `)

            if (!isWaitingForInput) {
                addToOutput("Execution completed", "system")
            }
        } catch (error) {
            let errorMessage = "Unknown error occurred"

            if (error instanceof Error) {
                errorMessage = error.message
            } else if (typeof error === "string") {
                errorMessage = error
            } else if (error && typeof error === "object" && "toString" in error) {
                errorMessage = error.toString()
            }

            errorMessage = errorMessage.replace(/File "\/.*?", /g, "")
            addToOutput(`Error: ${errorMessage}`, "error")
        } finally {
            setIsRunning(false)
            setIsExecuting(false)
        }
    }

    const stopExecution = () => {
        setIsRunning(false)
        setIsExecuting(false)
        setIsWaitingForInput(false)
        setInputResolver(null)
        setInputPrompt("")
        addToOutput("Execution stopped", "system")
    }

    // Input handling
    const handleInputSubmit = () => {
        if (isWaitingForInput && inputResolver) {
            addToOutput(userInput, "input")
            inputResolver(userInput)
            setUserInput("")
            setIsWaitingForInput(false)
            setInputResolver(null)
            setInputPrompt("")
        }
    }

    // Resizing functions
    const handleMouseDown = (e: React.MouseEvent) => {
        isResizing.current = true
        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
        document.body.style.userSelect = "none"
    }

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return
        const newWidth = e.clientX - 60
        setSidebarWidth(newWidth)
        e.preventDefault()
        if (monacoEditorRef.current) {
            monacoEditorRef.current.layout()
        }
    }

    const handleMouseUp = () => {
        isResizing.current = false
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.userSelect = "auto"
    }

    const handleEditorDidMount = (editor: any) => {
        monacoEditorRef.current = editor
    }

    // Enhanced auto-save functionality - saves every 30 seconds
    useEffect(() => {
        // Clear existing interval
        if (autoSaveIntervalRef.current) {
            clearInterval(autoSaveIntervalRef.current)
        }

        // Set up new auto-save interval
        autoSaveIntervalRef.current = setInterval(() => {
            if (!isSavedToLocalStorage && files.length > 0) {
                const success = saveToLocalStorage()
                if (success) {
                    const now = new Date().toLocaleTimeString()
                    setLastAutoSave(now)
                    addToOutput(`⚡ Auto-saved to local storage at ${now}`, "system")
                }
            }
        }, 30000) // 30 seconds

        // Cleanup on unmount
        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current)
            }
        }
    }, [isSavedToLocalStorage, saveToLocalStorage, files])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isWaitingForInput || (e.target as HTMLElement)?.tagName === "INPUT") {
                return
            }

            if (e.key === "F5") {
                e.preventDefault()
                runCode()
            } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault()
                saveProject()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isWaitingForInput])

    // Check for unsaved changes
    const hasUnsavedChanges = useCallback(() => {
        return !isSavedToLocalStorage || !isSavedToDatabase
    }, [isSavedToLocalStorage, isSavedToDatabase])

    // Handle beforeunload event
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges()) {
                e.preventDefault()
                e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
                return "You have unsaved changes. Are you sure you want to leave?"
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }, [hasUnsavedChanges])

    // Sidebar links
    const links = [
        {
            label: "Home",
            href: "/studenthome/",
            icon: <IconBrandTabler className="text-orange-400 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: "Profile",
            href: "#",
            icon: <IconUserBolt className="text-orange-400 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: "Python IDE",
            href: "/studenthome/python/ide",
            icon: <IconBrandPython className="text-orange-400 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: "Dependencies",
            href: "/studenthome/python/dependencies",
            icon: <IconPackage className="text-orange-400 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: "Templates",
            href: "/studenthome/python/templates",
            icon: <IconTemplate className="text-orange-400 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: "Settings",
            href: "#",
            icon: <IconSettings className="text-orange-400 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: "Logout",
            href: "/api/auth/signout",
            icon: <IconArrowLeft className="text-orange-400 h-5 w-5 flex-shrink-0" />,
        },
    ]

    const Logo = () => (
        <Link href="/" className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20">
            <div className="h-6 w-6 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-lg shadow-lg shadow-orange-500/30 flex-shrink-0" />
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-semibold text-white whitespace-pre bg-gradient-to-r from-orange-400 to-white bg-clip-text text-transparent"
            >
                SchoolNest
            </motion.span>
        </Link>
    )

    const LogoIcon = () => (
        <Link href="#" className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20">
            <div className="h-6 w-6 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-lg shadow-lg shadow-orange-500/30 flex-shrink-0" />
        </Link>
    )

    // Enhanced GitHub integration using backend routes
    const createRepoViaBackend = async (repoName: string, description = "") => {
        try {
            const response = await fetch("/api/github/create-repo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: repoName,
                    description: description || `Created via SchoolNest Python IDE - ${currentProject}`,
                    isPrivate: false,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || data.error || "Failed to create repository")
            }

            addToOutput(`✓ Repository "${repoName}" created successfully!`, "system")
            return data
        } catch (error: any) {
            addToOutput(`✗ Failed to create repository: ${error.message}`, "error")
            throw error
        }
    }

    const pushFileViaBackend = async (owner: string, repo: string, filename: string, content: string) => {
        try {
            const response = await fetch("/api/github/push", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    owner,
                    repo,
                    path: filename,
                    content,
                    message: `Update ${filename} via SchoolNest Python IDE`,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to push file")
            }

            addToOutput(`✓ File "${filename}" pushed successfully to ${owner}/${repo}`, "system")
            return data
        } catch (error: any) {
            addToOutput(`✗ Failed to push file: ${error.message}`, "error")
            throw error
        }
    }

    const pullFileViaBackend = async (owner: string, repo: string, filename: string) => {
        try {
            const response = await fetch(`/api/github/pull?owner=${owner}&repo=${repo}&path=${filename}`)

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to pull file")
            }

            addToOutput(`✓ File "${filename}" pulled successfully from ${owner}/${repo}`, "system")
            return data.content
        } catch (error: any) {
            addToOutput(`✗ Failed to pull file: ${error.message}`, "error")
            throw error
        }
    }

    // Enhanced GitHub operations for Python files
    const handleGitHubOperations = {
        createRepo: async () => {
            const repoName = prompt(`Enter repository name for project "${currentProject}":`)
            if (!repoName || !repoName.trim()) {
                addToOutput("Repository name is required", "error")
                return null
            }

            try {
                const repo = await createRepoViaBackend(repoName.trim())
                return repo
            } catch (error) {
                return null
            }
        },

        pushProject: async (owner: string, repo: string) => {
            if (!files.length) {
                addToOutput("No files to push", "error")
                return
            }

            const pythonFiles = files.filter((f) => f.filename.endsWith(".py"))
            if (!pythonFiles.length) {
                addToOutput("No Python files to push", "error")
                return
            }

            addToOutput(`Pushing ${pythonFiles.length} Python files...`, "system")

            try {
                for (const file of pythonFiles) {
                    await pushFileViaBackend(owner, repo, file.filename, file.contents)
                }
                addToOutput(`✓ Successfully pushed ${pythonFiles.length} files`, "system")
            } catch (error) {
                addToOutput("Push operation failed", "error")
            }
        },

        pullFile: async (owner: string, repo: string, filename: string) => {
            try {
                const content = await pullFileViaBackend(owner, repo, filename)

                // Add or update the file in the current project
                const existingFileIndex = files.findIndex((f) => f.filename === filename)
                if (existingFileIndex >= 0) {
                    setFiles((prev) => prev.map((f, i) => (i === existingFileIndex ? { ...f, contents: content } : f)))
                } else {
                    setFiles((prev) => [...prev, { filename, contents: content }])
                }

                setActiveFile(filename)
                setIsSavedToLocalStorage(false)
                setIsSavedToDatabase(false)
            } catch (error) {
                // Error already logged in pullFileViaBackend
            }
        },
    }

    return (
        <>
            <Script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js" strategy="beforeInteractive" />

            <div
                className={cn(
                    "rounded-md flex flex-col md:flex-row bg-black w-full flex-1 border border-slate-800 overflow-hidden",
                    "h-screen",
                )}
            >
                <Sidebar open={open} setOpen={setOpen}>
                    <SidebarBody className="justify-between gap-10 bg-slate-900">
                        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden ml-1 mb-2 pb-6">
                            {open ? <Logo /> : <LogoIcon />}
                            <div className="mt-8 flex flex-col gap-2">
                                {links.map((link, idx) => (
                                    <SidebarLink key={idx} link={link} />
                                ))}
                            </div>
                        </div>
                        <div>
                            {signedIn && (
                                <SidebarLink
                                    link={{
                                        label: name,
                                        href: "#",
                                        icon: (
                                            <Image
                                                src="/sc_logo.png"
                                                className="h-7 w-7 flex-shrink-0 rounded-full border border-orange-400"
                                                width={50}
                                                height={50}
                                                alt="Avatar"
                                            />
                                        ),
                                    }}
                                />
                            )}
                        </div>
                    </SidebarBody>
                </Sidebar>

                {/* File Explorer Sidebar */}
                <div
                    className="border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 backdrop-blur-xl flex flex-col"
                    style={{ width: sidebarWidth }}
                >
                    <div className="p-6 -mt-2 h-full flex flex-col overflow-hidden">
                        {/* Project Header */}
                        <div className="mb-4 flex-shrink-0 font-bold flex items-center gap-2">
                            <IconBrandPython className="w-5 h-5 text-orange-400" />
                            Python IDE
                        </div>

                        {/* Project Selector */}
                        <div className="mb-4">
                            <select
                                value={currentProject}
                                onChange={(e) => setCurrentProject(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                            >
                                {projectList.map((project) => (
                                    <option key={project} value={project}>
                                        {project}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Files Section */}
                        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-orange-300 dark:scrollbar-thumb-orange-600 hover:scrollbar-thumb-orange-400 dark:hover:scrollbar-thumb-orange-500 scrollbar-thumb-rounded-full pb-4">
                            {/* main.py - Always first */}
                            <div className="relative group">
                                <button
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 border ${
                                        activeFile === "main.py"
                                            ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm"
                                            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                                    }`}
                                    onClick={() => setActiveFile("main.py")}
                                >
                                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-sm">
                                        <IconCode className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="font-mono text-sm font-medium truncate">main.py</span>
                                        {activeFile === "main.py" && (
                                            <span className="text-orange-500 dark:text-orange-400 text-xs">Entry point</span>
                                        )}
                                    </div>
                                </button>
                            </div>

                            {/* Other Files */}
                            {files
                                .filter((file) => file.filename !== "main.py")
                                .map((file) => (
                                    <div key={file.filename} className="relative group">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                className={`flex-1 text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 border ${
                                                    activeFile === file.filename
                                                        ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm"
                                                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                                                }`}
                                                onClick={() => setActiveFile(file.filename)}
                                            >
                                                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-sm">
                                                    <Code className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="font-mono text-sm font-medium truncate flex-1">{file.filename}</span>
                                            </button>

                                            {/* Action Buttons */}
                                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <button
                                                    onClick={() => {
                                                        const newFileName = prompt("Enter new file name", file.filename)
                                                        if (newFileName && newFileName !== file.filename) {
                                                            renameFile(file.filename, newFileName)
                                                        }
                                                    }}
                                                    className="p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-all duration-200 border border-neutral-200 dark:border-neutral-700 hover:border-orange-300 dark:hover:border-orange-600"
                                                    title="Rename file"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400" />
                                                </button>
                                                <button
                                                    onClick={() => removeFile(file.filename)}
                                                    className="p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-all duration-200 border border-neutral-200 dark:border-neutral-700 hover:border-red-300 dark:hover:border-red-600"
                                                    title="Delete file"
                                                >
                                                    <IconTrash className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Actions Section */}
                        <div className="space-y-4 flex-shrink-0">
                            <div className="flex items-center space-x-2 mb-4">
                                <Play className="h-4 w-4 text-orange-500" />
                                <h3 className="text-neutral-900 dark:text-white text-sm font-semibold">Actions</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    className="rounded-lg py-3 px-4 bg-orange-100 dark:bg-orange-800 hover:bg-orange-200 dark:hover:bg-orange-700 text-orange-700 dark:text-orange-300 font-medium transition-all duration-200 border border-orange-200 dark:border-orange-700 hover:border-orange-300 dark:hover:border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                    onClick={addFile}
                                    disabled={!pyodide}
                                >
                                    <IconFileDownload className="w-4 h-4" />
                                    <span className="text-sm">Add File</span>
                                </button>

                                <button
                                    className="rounded-lg py-3 px-4 bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 text-green-700 dark:text-green-300 font-medium transition-all duration-200 border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                    onClick={isRunning ? stopExecution : runCode}
                                    disabled={!pyodide}
                                >
                                    {isRunning ? <IconPlayerStop className="w-4 h-4" /> : <IconPlayerPlayFilled className="w-4 h-4" />}
                                    <span className="text-sm">{isRunning ? "Stop" : "Run"}</span>
                                </button>

                                <button
                                    className="rounded-lg py-3 px-4 bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-300 font-medium transition-all duration-200 border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                    onClick={handleExport}
                                    disabled={!pyodide}
                                >
                                    <IconFolderDown className="w-4 h-4" />
                                    <span className="text-sm">Export</span>
                                </button>

                                <button
                                    className="rounded-lg py-3 px-4 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-300 font-medium transition-all duration-200 border border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                    onClick={saveProject}
                                    disabled={!pyodide}
                                >
                                    <IconCloudUpload className="w-4 h-4" />
                                    <span className="text-sm">Save</span>
                                </button>

                                <label className="rounded-lg py-3 px-4 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 font-medium cursor-pointer transition-all duration-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-[0.98]">
                                    <IconUpload className="w-4 h-4" />
                                    <span className="text-sm">Load</span>
                                    <input
                                        type="file"
                                        accept=".py,.zip"
                                        onChange={handleFileUpload}
                                        disabled={!pyodide}
                                        className="hidden"
                                    />
                                </label>

                                <button
                                    className="rounded-lg py-3 px-4 bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 text-green-700 dark:text-green-300 font-medium transition-all duration-200 border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                    onClick={async () => {
                                        const repo = await handleGitHubOperations.createRepo()
                                        if (repo) {
                                            await handleGitHubOperations.pushProject(repo.owner.login, repo.name)
                                        }
                                    }}
                                    disabled={!pyodide}
                                >
                                    <IconBrandGithub className="w-4 h-4" />
                                    <span className="text-sm">Create & Push</span>
                                </button>

                                <button
                                    className="rounded-lg py-3 px-4 bg-cyan-100 dark:bg-cyan-800 hover:bg-cyan-200 dark:hover:bg-cyan-700 text-cyan-700 dark:text-cyan-300 font-medium transition-all duration-200 border border-cyan-200 dark:border-cyan-700 hover:border-cyan-300 dark:hover:border-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                    onClick={async () => {
                                        const repoUrl = prompt("Enter repository URL (owner/repo):")
                                        if (repoUrl) {
                                            const [owner, repo] = repoUrl.split("/")
                                            const filename = prompt("Enter filename to pull (e.g., main.py):")
                                            if (filename && owner && repo) {
                                                await handleGitHubOperations.pullFile(owner, repo, filename)
                                            }
                                        }
                                    }}
                                    disabled={!pyodide}
                                >
                                    <IconCloudDownload className="w-4 h-4" />
                                    <span className="text-sm">Pull File</span>
                                </button>
                            </div>

                            {/* Loading State */}
                            {!pyodide && (
                                <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <IconLoader className="h-4 w-4 text-orange-500 animate-spin" />
                                        <span className="text-neutral-600 dark:text-neutral-400 text-sm font-medium">
                      Loading Python Environment...
                    </span>
                                    </div>
                                </div>
                            )}

                            {/* Enhanced Save Status */}
                            {(hasUnsavedChanges() || lastLocalStorageSave) && (
                                <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                                    <div className="text-xs space-y-1">
                                        <div
                                            className={`flex items-center space-x-2 ${isSavedToLocalStorage ? "text-green-600" : "text-yellow-600"}`}
                                        >
                                            <div
                                                className={`w-2 h-2 rounded-full ${isSavedToLocalStorage ? "bg-green-500" : "bg-yellow-500"}`}
                                            />
                                            <span>Local: {isSavedToLocalStorage ? "Saved" : "Unsaved"}</span>
                                        </div>
                                        <div
                                            className={`flex items-center space-x-2 ${isSavedToDatabase ? "text-green-600" : "text-yellow-600"}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${isSavedToDatabase ? "bg-green-500" : "bg-yellow-500"}`} />
                                            <span>Database: {isSavedToDatabase ? "Saved" : "Unsaved"}</span>
                                        </div>
                                        {lastLocalStorageSave && (
                                            <div className="text-neutral-500 text-xs">
                                                Last saved: {new Date(lastLocalStorageSave).toLocaleTimeString()}
                                            </div>
                                        )}
                                        {lastAutoSave && <div className="text-blue-500 text-xs">Auto-save: {lastAutoSave} (every 30s)</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Resizer */}
                <div
                    className="w-1 h-full bg-neutral-300 dark:bg-neutral-600 cursor-col-resize hover:bg-orange-500 dark:hover:bg-orange-500 transition-all duration-200"
                    onMouseDown={handleMouseDown}
                />

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* File Tab */}
                    <div className="bg-[#1E1E1E] border-b border-neutral-700">
                        <p className="ml-2 font-mono text-white py-2">{activeFile}</p>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1">
                        <MonacoEditor
                            language="python"
                            theme="vs-dark"
                            value={getActiveFileContent()}
                            onChange={(value) => updateFileContent(value || "")}
                            options={{
                                automaticLayout: true,
                                fontSize: 14,
                                lineNumbers: "on",
                                minimap: { enabled: true },
                                wordWrap: "on",
                                tabSize: 4,
                                insertSpaces: true,
                            }}
                            onMount={handleEditorDidMount}
                        />
                    </div>

                    {/* Output Panel */}
                    <div
                        style={{
                            height: "5px",
                            cursor: "row-resize",
                            backgroundColor: "#ccc",
                        }}
                    />

                    <div
                        style={{
                            height: `${outputHeight}px`,
                            borderTop: "1px solid #333",
                            backgroundColor: "#1a1a1a",
                            color: "#ffffff",
                            fontFamily: "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
                            fontSize: "13px",
                            lineHeight: "1.4",
                            padding: "0",
                            overflowY: "auto",
                            position: "relative",
                        }}
                        ref={outputRef}
                    >
                        {/* Terminal Header */}
                        <div className="sticky top-0 bg-[#2d2d2d] border-b border-gray-600 px-4 py-2 flex items-center justify-between z-10">
                            <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="text-gray-300 text-sm font-medium ml-2">Python Terminal</span>
                            </div>
                            <button
                                onClick={clearOutput}
                                className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                            >
                                Clear
                            </button>
                        </div>

                        {/* Terminal Content */}
                        <div className="p-4 space-y-1">
                            {output.length === 0 && (
                                <div className="text-gray-500 italic">
                                    Python {pyodide ? "3.11.0" : "loading..."} | Ready for execution
                                </div>
                            )}

                            {output.map((item, index) => (
                                <div key={index} className="flex items-start space-x-2">
                                    {/* Timestamp and type indicator */}
                                    <span className="text-gray-500 text-xs mt-0.5 min-w-[60px] font-mono">{item.timestamp}</span>

                                    {/* Type indicator */}
                                    <span
                                        className={`text-xs mt-0.5 min-w-[8px] ${
                                            item.type === "error"
                                                ? "text-red-400"
                                                : item.type === "system"
                                                    ? "text-blue-400"
                                                    : item.type === "input"
                                                        ? "text-green-400"
                                                        : "text-gray-400"
                                        }`}
                                    >
                    {item.type === "error" ? "✗" : item.type === "system" ? "●" : item.type === "input" ? ">" : "○"}
                  </span>

                                    {/* Content */}
                                    <div
                                        className={`flex-1 font-mono ${
                                            item.type === "error"
                                                ? "text-red-300"
                                                : item.type === "system"
                                                    ? "text-blue-300"
                                                    : item.type === "input"
                                                        ? "text-green-300"
                                                        : "text-white"
                                        }`}
                                    >
                                        <pre className="whitespace-pre-wrap break-words m-0 font-inherit text-inherit">{item.text}</pre>
                                    </div>
                                </div>
                            ))}

                            {/* Input field when waiting for user input */}
                            {isWaitingForInput && (
                                <div className="flex items-center space-x-2 mt-2 bg-gray-800 rounded px-2 py-1">
                                    <span className="text-green-400 font-mono">{">"}</span>
                                    <span className="text-yellow-300 text-sm">{inputPrompt}</span>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                handleInputSubmit()
                                            }
                                        }}
                                        className="flex-1 bg-transparent text-white outline-none font-mono placeholder-gray-500"
                                        placeholder="Enter input and press Enter..."
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
