"use client"

import { Sidebar, SidebarBody, SidebarLink } from "@/app/components/ui/sidebar"
import {
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
  IconCode,
  IconPackage,
  IconTemplate,
  IconTrash,
  IconFolderDown,
  IconLoader,
  IconFileDownload,
  IconUpload,
  IconPlayerPlayFilled,
  IconCloudDownload,
  IconBrandGithub,
  IconCloudUpload,
  IconArrowLeft,
} from "@tabler/icons-react"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"

import type React from "react"
import { useRef, useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { Code, Edit3, Play } from 'lucide-react'

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

interface File {
  filename: string
  contents: string
}

interface OutputItem {
  text: string
  type: "output" | "error" | "system" | "input"
  timestamp: string
}

// Enhanced localStorage manager for C++ projects
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
  getAllCppProjects: () => {
    if (typeof window === "undefined") return []

    const projects = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("cpp_project_")) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}")
          if (data.files && Array.isArray(data.files)) {
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
    return projects
  },
}

class CPPCompiler {
  private _initialized = false

  get initialized(): boolean {
    return this._initialized
  }

  private compilerEndpoint = "https://emkc.org/api/v2/piston/execute"

  constructor() {
    this._initialized = true
  }

  async compile(code: string): Promise<{ success: boolean; output: string; compiledCode?: string }> {
    try {
      console.log("Sending code to real C++ compiler service...")

      const response = await fetch(this.compilerEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          language: "c++",
          version: "*",
          files: [
            {
              name: "main.cpp",
              content: code,
            },
          ],
          stdin: "",
          args: [],
          compile_timeout: 10000,
          run_timeout: 3000,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Piston API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()

      if (result.compile && result.compile.code !== 0) {
        return {
          success: false,
          output: `Compilation failed:\n${result.compile.stderr || result.compile.stdout || "Unknown compilation error"}`,
        }
      }

      if (result.run && result.run.code !== 0) {
        return {
          success: true,
          output: `Compilation successful!\nRuntime output:\n${result.run.stdout || ""}\nRuntime errors:\n${result.run.stderr || ""}`,
          compiledCode: JSON.stringify(result),
        }
      }

      return {
        success: true,
        output: `Compilation and execution successful!\nOutput:\n${result.run?.stdout || "No output"}`,
        compiledCode: JSON.stringify(result),
      }
    } catch (error) {
      console.error("Piston compilation error:", error)

      try {
        return await this.compileWithWandbox(code)
      } catch (altError) {
        console.error("Wandbox compilation failed:", altError)
        return {
          success: false,
          output: `All compilation services failed:\n1. Piston: ${error}\n2. Wandbox: ${altError}`,
        }
      }
    }
  }

  private async compileWithWandbox(code: string): Promise<{ success: boolean; output: string; compiledCode?: string }> {
    const response = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        compiler: "gcc-head",
        code: code,
        options: "warning,gnu++2a",
        "compiler-option-raw": "-std=c++20 -O2",
        save: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Wandbox API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()

    if (result.status !== 0) {
      return {
        success: false,
        output: `Compilation failed:\n${result.compiler_error || result.program_error || "Unknown error"}`,
      }
    }

    return {
      success: true,
      output: `Compilation successful! (Wandbox GCC)\nOutput:\n${result.program_output || "No output"}\n${result.compiler_message || ""}`,
      compiledCode: JSON.stringify(result),
    }
  }
}

const Editor = () => {
  const [files, setFiles] = useState<File[]>([
    {
      filename: "main.cpp",
      contents: `#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "Hello from C++ compilation!" << std::endl;
    
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    std::cout << "Numbers: ";
    for(int num : numbers) {
        std::cout << num << " ";
    }
    std::cout << std::endl;
    
    return 0;
}`,
    },
  ])

  const [activeFile, setActiveFile] = useState("main.cpp")
  const [output, setOutput] = useState<OutputItem[]>([])
  const [compilerLoaded, setCompilerLoaded] = useState(true)
  const outputRef = useRef<HTMLDivElement>(null)
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const isResizing = useRef(false)
  const monacoEditorRef = useRef<any>(null)
  const [open, setOpen] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)

  // Project management
  const [currentProject, setCurrentProject] = useState("My C++ Project")
  const [projectList, setProjectList] = useState<string[]>(["My C++ Project"])

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
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const compiler = useRef(new CPPCompiler())

  // Initialize session and GitHub token
  useEffect(() => {
    if (session && (session.user.role === "student" || session.user.role === "educator")) {
      setSignedIn(true)
      setName(session.user.name || "User")

      if (session.accessToken) {
        setGithubToken(session.accessToken)
      }

      loadUserProjects()
    }
  }, [session])

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

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

  // File management functions
  const updateFileContent = (content: string) => {
    setFiles((prev) => prev.map((f) => (f.filename === activeFile ? { ...f, contents: content } : f)))
    setIsSavedToLocalStorage(false)
    setIsSavedToDatabase(false)
  }

  const addFile = () => {
    const baseName = "file"
    const extension = ".cpp"

    let maxSuffix = 0
    files.forEach((f) => {
      const match = f.filename.match(/^file(\d*)\.cpp$/)
      if (match) {
        const suffix = match[1] ? Number.parseInt(match[1], 10) : 0
        if (suffix >= maxSuffix) {
          maxSuffix = suffix + 1
        }
      }
    })
    const newFileName = `${baseName}${maxSuffix === 0 ? "" : maxSuffix}${extension}`
    setFiles([
      ...files,
      {
        filename: newFileName,
        contents: `#include <iostream>

int main() {
    std::cout << "Hello World!" << std::endl;
    return 0;
}`,
      },
    ])
    setActiveFile(newFileName)
    setIsSavedToLocalStorage(false)
    setIsSavedToDatabase(false)
  }

  const removeFile = (fileName: string) => {
    if (files.length === 1) {
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

    const saveKey = `cpp_project_${currentProject}`
    localStorageManager.setItem(saveKey, JSON.stringify(saveData))

    setIsSavedToLocalStorage(true)
    setLastLocalStorageSave(new Date().toISOString())

    // Dispatch custom event to notify repo page of updates
    if (typeof window !== "undefined") {
      window.dispatchEvent(
          new CustomEvent("cppProjectSaved", {
            detail: {
              project: currentProject,
              files: files.filter((f) =>
                  f.filename.endsWith(".cpp") ||
                  f.filename.endsWith(".c") ||
                  f.filename.endsWith(".h") ||
                  f.filename.endsWith(".hpp")
              )
            },
          }),
      )
    }

    return true
  }, [files, currentProject, activeFile])

  const loadFromLocalStorage = useCallback(() => {
    const saveKey = `cpp_project_${currentProject}`
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
        if (data.cpp_project_names) {
          setProjectList(data.cpp_project_names)
        }
      }
    } catch (error) {
      console.error("Failed to load projects:", error)
    }
  }

  // File upload functionality
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (e) => {
      const contents = e.target?.result as string
      const newFile = {
        filename: file.name,
        contents,
      }

      setFiles((prev) => [...prev, newFile])
      setActiveFile(file.name)
      addToOutput(`File "${file.name}" uploaded`, "system")
    }

    reader.readAsText(file)
    setIsSavedToLocalStorage(false)
    setIsSavedToDatabase(false)
  }

  const handleExport = () => {
    const file = files.find((f) => f.filename === activeFile)
    if (!file) {
      alert("No file selected.")
      return
    }

    const blob = new Blob([file.contents], { type: "text/plain" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = file.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
    addToOutput(`File exported as ${file.filename}`, "system")
  }

  // Code execution
  const runCode = async () => {
    if (!compilerLoaded) {
      addToOutput("C++ compiler is still loading! Please wait...", "error")
      return
    }

    setIsCompiling(true)
    addToOutput(`Compiling ${activeFile}...`, "system")

    try {
      const activeFileContent = getActiveFileContent()
      const result = await compiler.current.compile(activeFileContent)

      if (result.success) {
        addToOutput(result.output, "output")
      } else {
        addToOutput(result.output, "error")
      }
    } catch (error: any) {
      addToOutput("Runtime error: " + (error?.toString() || ""), "error")
    } finally {
      setIsCompiling(false)
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return
    updateFileContent(value)
  }

  const handleEditorDidMount = (editor: any) => {
    monacoEditorRef.current = editor
  }

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

  const Logo = () => {
    return (
        <Link href="/" className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20">
          <div className="h-6 w-6 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/30 flex-shrink-0" />
          <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-semibold text-white whitespace-pre bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent"
          >
            SchoolNest
          </motion.span>
        </Link>
    )
  }

  const LogoIcon = () => {
    return (
        <Link href="#" className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20">
          <div className="h-6 w-6 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/30 flex-shrink-0" />
        </Link>
    )
  }

  const links = [
    {
      label: "Home",
      href: "/studenthome/",
      icon: <IconBrandTabler className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Profile",
      href: "#",
      icon: <IconUserBolt className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "C++ IDE",
      href: "/studenthome/cpp/ide",
      icon: <IconCode className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Dependencies",
      href: "/studenthome/cpp/dependencies",
      icon: <IconPackage className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Templates",
      href: "/studenthome/cpp/templates",
      icon: <IconTemplate className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Settings",
      href: "#",
      icon: <IconSettings className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Logout",
      href: "/api/auth/signout",
      icon: <IconArrowLeft className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
  ]

  return (
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
                                className="h-7 w-7 flex-shrink-0 rounded-full border border-purple-400"
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

        <div
            className="border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 backdrop-blur-xl flex flex-col"
            style={{ width: sidebarWidth }}
        >
          <div className="p-6 -mt-2 h-full flex flex-col overflow-hidden">
            <div className="mb-4 flex-shrink-0 font-bold flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-purple-500"
                />
                <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-purple-500"
                />
                <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-purple-500"
                />
              </svg>
              C++ IDE
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

            <div
                className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-purple-300 dark:scrollbar-thumb-purple-600 hover:scrollbar-thumb-purple-400 dark:hover:scrollbar-thumb-purple-500 scrollbar-thumb-rounded-full pb-4"
                style={{ marginTop: "-12px" }}
            >
              <div className="relative group">
                <button
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 border ${
                        activeFile === "main.cpp"
                            ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 shadow-sm"
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                    }`}
                    onClick={() => setActiveFile("main.cpp")}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                    <IconCode className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-mono text-sm font-medium truncate">main.cpp</span>
                    {activeFile === "main.cpp" && (
                        <span className="text-purple-500 dark:text-purple-400 text-xs">Entry point</span>
                    )}
                  </div>
                </button>
              </div>

              {files
                  .filter((file) => file.filename !== "main.cpp")
                  .map((file) => (
                      <div key={file.filename} className="relative group">
                        <div className="flex items-center space-x-2">
                          <button
                              className={`flex-1 text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 border ${
                                  activeFile === file.filename
                                      ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 shadow-sm"
                                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                              }`}
                              onClick={() => setActiveFile(file.filename)}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                              <Code className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-mono text-sm font-medium truncate flex-1">{file.filename}</span>
                          </button>

                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                                onClick={() => {
                                  const newFileName = prompt("Enter new file name", file.filename)
                                  if (newFileName && newFileName !== file.filename) {
                                    renameFile(file.filename, newFileName)
                                  }
                                }}
                                className="p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-all duration-200 border border-neutral-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-600"
                                title="Rename file"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400" />
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

            <div className="space-y-4 flex-shrink-0">
              <div className="flex items-center space-x-2 mb-4">
                <Play className="h-4 w-4 text-purple-500" />
                <h3 className="text-neutral-900 dark:text-white text-sm font-semibold">Actions</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                    className="rounded-lg py-3 px-4 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 font-medium transition-all duration-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                    onClick={addFile}
                    disabled={!compilerLoaded}
                >
                  <IconFileDownload className="w-4 h-4" />
                  <span className="text-sm">Add File</span>
                </button>

                <button
                    className="rounded-lg py-3 px-4 bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 text-green-700 dark:text-green-300 font-medium transition-all duration-200 border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                    onClick={runCode}
                    disabled={!compilerLoaded || isCompiling}
                >
                  <IconPlayerPlayFilled className="w-4 h-4" />
                  <span className="text-sm">{isCompiling ? "Compiling..." : "Run File"}</span>
                </button>

                <button
                    className="rounded-lg py-3 px-4 bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-300 font-medium transition-all duration-200 border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                    onClick={handleExport}
                    disabled={!compilerLoaded}
                >
                  <IconFolderDown className="w-4 h-4" />
                  <span className="text-sm">Export</span>
                </button>

                <button
                    className="rounded-lg py-3 px-4 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-300 font-medium transition-all duration-200 border border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                    onClick={saveProject}
                    disabled={!compilerLoaded}
                >
                  <IconCloudUpload className="w-4 h-4" />
                  <span className="text-sm">Save</span>
                </button>

                <label className="rounded-lg py-3 px-4 bg-orange-100 dark:bg-orange-800 hover:bg-orange-200 dark:hover:bg-orange-700 text-orange-700 dark:text-orange-300 font-medium cursor-pointer transition-all duration-200 border border-orange-200 dark:border-orange-700 hover:border-orange-300 dark:hover:border-orange-600 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-[0.98]">
                  <IconUpload className="w-4 h-4" />
                  <span className="text-sm">Load</span>
                  <input
                      type="file"
                      accept=".cpp,.h,.hpp,.c"
                      onChange={handleFileUpload}
                      disabled={!compilerLoaded}
                      className="hidden"
                  />
                </label>

                <button
                    className="rounded-lg py-3 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium transition-all duration-200 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                    onClick={() => router.push("/studenthome/cpp/repo")}
                    disabled={!compilerLoaded}
                >
                  <IconBrandGithub className="w-4 h-4" />
                  <span className="text-sm">Repo</span>
                </button>
              </div>

              {!compilerLoaded && (
                  <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <IconLoader className="h-4 w-4 text-purple-500 animate-spin" />
                      <span className="text-neutral-600 dark:text-neutral-400 text-sm font-medium">
                    Loading C++ Compiler...
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
                      {lastAutoSave && <div className="text-purple-500 text-xs">Auto-save: {lastAutoSave} (every 30s)</div>}
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>

        <div
            className="w-1 h-full bg-neutral-300 dark:bg-neutral-600 cursor-col-resize hover:bg-purple-500 dark:hover:bg-purple-500 transition-all duration-200"
            onMouseDown={handleMouseDown}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-[#1E1E1E] border-b border-neutral-700">
            <p className="ml-2 font-mono text-white py-2">{activeFile}</p>
          </div>
          <div className="flex-1">
            <MonacoEditor
                language="cpp"
                theme="vs-dark"
                value={getActiveFileContent()}
                onChange={handleEditorChange}
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

          <div
              style={{
                height: "5px",
                cursor: "row-resize",
                backgroundColor: "#ccc",
              }}
          />

          <div
              style={{
                height: "200px",
                borderTop: "1px solid #ccc",
                backgroundColor: "#1e1e1e",
                color: "white",
                fontFamily: "monospace",
                padding: "10px",
                overflowY: "auto",
              }}
              ref={outputRef}
          >
            {/* Output Header */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-600">
              <span className="text-sm font-semibold text-gray-300">Output</span>
              <button
                  onClick={clearOutput}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>

            {/* Output Content */}
            {output.map((item, index) => (
                <div
                    key={index}
                    className={`mb-1 ${
                        item.type === "error"
                            ? "text-red-400"
                            : item.type === "system"
                                ? "text-yellow-400"
                                : item.type === "input"
                                    ? "text-green-400"
                                    : "text-white"
                    }`}
                >
                  {item.type === "system" && <span className="text-gray-500">[{item.timestamp}] </span>}
                  <span className="whitespace-pre-wrap">{item.text}</span>
                </div>
            ))}
          </div>
        </div>
      </div>
  )
}

export default Editor
