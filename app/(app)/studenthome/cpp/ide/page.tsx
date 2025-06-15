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
} from "@tabler/icons-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

import type React from "react"
import { useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Code, Edit3, Play } from "lucide-react"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

interface File {
  filename: string
  contents: string
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

      const runtimesResponse = await fetch("https://emkc.org/api/v2/piston/runtimes")
      if (runtimesResponse.ok) {
        const runtimes = await runtimesResponse.json()
        console.log("Available runtimes:", runtimes)
      }

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
      contents: `// hello.cpp

#include <iostream>
#include <string>

// Function to greet the user
std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}

int main() {
    std::cout << "Hello, world!" << std::endl;

    std::string name = "Alice";
    std::cout << greet(name) << std::endl;

    return 0;
}`,
    },
  ])

  const [activeFile, setActiveFile] = useState("main.cpp")
  const [outputLines, setOutputLines] = useState<string[]>([])
  const [compilerLoaded, setCompilerLoaded] = useState(true)
  const outputRef = useRef<HTMLDivElement>(null)
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const isResizing = useRef(false)
  const monacoEditorRef = useRef<any>(null)
  const [open, setOpen] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)

  const inputFieldRef = useRef<HTMLInputElement>(null)
  const [waitingForInput, setWaitingForInput] = useState(false)
  const [inputBuffer, setInputBuffer] = useState<string[]>([])
  const [programRunning, setProgramRunning] = useState(false)
  const [currentInputIndex, setCurrentInputIndex] = useState(0)
  const [displayedOutput, setDisplayedOutput] = useState<string[]>([])

  const compiler = useRef(new CPPCompiler())

  const runCode = async () => {
    if (!compilerLoaded) {
      setOutputLines(["C++ compiler is still loading! Please wait..."])
      return
    }

    setIsCompiling(true)
    setOutputLines([`Compiling ${activeFile}...`])
    setDisplayedOutput([])
    setInputBuffer([])
    setProgramRunning(true)
    setCurrentInputIndex(0)

    try {
      const activeFileContent = files.find((f) => f.filename === activeFile)?.contents || ""

      // Start by showing only up to the first question
      await showProgressiveOutput(activeFileContent, "", 0)
    } catch (error: any) {
      setOutputLines((prev) => [...prev, "Runtime error: " + (error?.toString() || "")])
      setProgramRunning(false)
    } finally {
      setIsCompiling(false)
    }
  }

  const showProgressiveOutput = async (code: string, currentInput: string, inputIndex: number) => {
    try {
      // Get the full output with current inputs
      const result = await compileWithInput(code, currentInput)

      if (!result.success) {
        setOutputLines((prev) => [...prev, result.output])
        setProgramRunning(false)
        return
      }

      const fullOutput = result.output.trim()
      const outputLines = fullOutput.split("\n")

      // Find input prompts in the output
      const inputPrompts = findInputPrompts(outputLines)

      if (inputPrompts.length === 0) {
        // No input prompts found, show full output
        setDisplayedOutput([`Compiling ${activeFile}...`, ...outputLines])
        setOutputLines([`Compiling ${activeFile}...`, ...outputLines])
        setProgramRunning(false)
        setWaitingForInput(false)
        setOutputLines((prev) => [...prev, "\n--- Program execution completed ---"])
        return
      }

      if (inputIndex < inputPrompts.length) {
        // Show output up to the current input prompt
        const promptLineIndex = inputPrompts[inputIndex]
        const visibleLines = outputLines.slice(0, promptLineIndex + 1)

        setDisplayedOutput([`Compiling ${activeFile}...`, ...visibleLines])
        setOutputLines([`Compiling ${activeFile}...`, ...visibleLines])

        setWaitingForInput(true)
        setCurrentInputIndex(inputIndex)

        setTimeout(() => {
          if (inputFieldRef.current) {
            inputFieldRef.current.disabled = false
            inputFieldRef.current.focus()
          }
        }, 100)
      } else {
        // All inputs provided, show final output
        setDisplayedOutput([`Compiling ${activeFile}...`, ...outputLines])
        setOutputLines([`Compiling ${activeFile}...`, ...outputLines])
        setProgramRunning(false)
        setWaitingForInput(false)
        setOutputLines((prev) => [...prev, "\n--- Program execution completed ---"])
      }

      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight
      }
    } catch (error) {
      setOutputLines((prev) => [...prev, "Error: " + (error instanceof Error ? error.message : String(error))])
      setProgramRunning(false)
      setWaitingForInput(false)
    }
  }

  const findInputPrompts = (outputLines: string[]): number[] => {
    const promptIndices: number[] = []

    for (let i = 0; i < outputLines.length; i++) {
      const line = outputLines[i].toLowerCase()
      // Look for common input prompt patterns
      if (
        line.includes("?") ||
        (line.includes("enter") && (line.includes("your") || line.includes("a") || line.includes("the"))) ||
        (line.includes("input") && line.includes("your")) ||
        (line.includes("name") && line.includes("your")) ||
        (line.includes("age") && (line.includes("old") || line.includes("your"))) ||
        (line.includes("type") && line.includes("your")) ||
        line.includes("please enter")
      ) {
        promptIndices.push(i)
      }
    }

    return promptIndices
  }

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputFieldRef.current && waitingForInput) {
      e.preventDefault()
      const value = inputFieldRef.current.value.trim()

      if (value) {
        // Show the user's input in the console immediately
        setDisplayedOutput((prev) => [...prev, value])
        setOutputLines((prev) => [...prev, value])

        // Add to input buffer
        const newInputBuffer = [...inputBuffer, value]
        setInputBuffer(newInputBuffer)

        // Disable input field temporarily
        setWaitingForInput(false)
        inputFieldRef.current.disabled = true
        inputFieldRef.current.value = ""

        // Get the program output with all inputs so far
        const allInputs = newInputBuffer.join("\n") + "\n"
        const activeFileContent = files.find((f) => f.filename === activeFile)?.contents || ""

        // Get full output with current inputs
        const result = await compileWithInput(activeFileContent, allInputs)

        if (result.success) {
          const fullOutput = result.output.trim()
          const outputLines = fullOutput.split("\n")
          const inputPrompts = findInputPrompts(outputLines)

          // Show output progressively based on how many inputs we have
          if (currentInputIndex + 1 < inputPrompts.length) {
            // There are more prompts, show up to the next one
            const nextPromptIndex = inputPrompts[currentInputIndex + 1]
            const visibleLines = outputLines.slice(0, nextPromptIndex + 1)

            setDisplayedOutput([`Compiling ${activeFile}...`, ...visibleLines])
            setOutputLines([`Compiling ${activeFile}...`, ...visibleLines])

            setWaitingForInput(true)
            setCurrentInputIndex(currentInputIndex + 1)

            setTimeout(() => {
              if (inputFieldRef.current) {
                inputFieldRef.current.disabled = false
                inputFieldRef.current.focus()
              }
            }, 100)
          } else {
            // No more prompts, show complete output
            setDisplayedOutput([`Compiling ${activeFile}...`, ...outputLines])
            setOutputLines([`Compiling ${activeFile}...`, ...outputLines])
            setProgramRunning(false)
            setWaitingForInput(false)
            setOutputLines((prev) => [...prev, "\n--- Program execution completed ---"])
          }
        } else {
          setOutputLines((prev) => [...prev, result.output])
          setProgramRunning(false)
          setWaitingForInput(false)
        }

        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
      }
    }
  }

  const compileWithInput = async (
    code: string,
    stdin: string,
  ): Promise<{ success: boolean; output: string; compiledCode?: string }> => {
    try {
      console.log("Sending code to real C++ compiler service with input:", stdin)

      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
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
          stdin: stdin,
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
        output: `${result.run?.stdout || "No output"}`,
        compiledCode: JSON.stringify(result),
      }
    } catch (error) {
      console.error("Piston compilation error:", error)
      try {
        return await compileWithWandboxAndInput(code, stdin)
      } catch (altError) {
        console.error("Wandbox compilation failed:", altError)
        return {
          success: false,
          output: `All compilation services failed:\n1. Piston: ${error}\n2. Wandbox: ${altError}`,
        }
      }
    }
  }

  const compileWithWandboxAndInput = async (
    code: string,
    stdin: string,
  ): Promise<{ success: boolean; output: string; compiledCode?: string }> => {
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
        stdin: stdin,
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
      output: `${result.program_output || "No output"}\n${result.compiler_message || ""}`,
      compiledCode: JSON.stringify(result),
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return
    setFiles((prev) => prev.map((file) => (file.filename === activeFile ? { ...file, contents: value } : file)))
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
  }

  const removeFile = (fileName: string) => {
    if (files.length === 1) return
    const newFiles = files.filter((f) => f.filename !== fileName)
    setFiles(newFiles)
    if (activeFile === fileName && newFiles.length > 0) {
      setActiveFile(newFiles[0].filename)
    }
  }

  const renameFile = (oldFileName: string, newFileName: string) => {
    if (files.some((f) => f.filename === newFileName)) {
      alert("A file with that name already exists.")
      return
    }
    const updatedFiles = files.map((f) => (f.filename === oldFileName ? { ...f, filename: newFileName } : f))
    setFiles(updatedFiles)
    if (activeFile === oldFileName) {
      setActiveFile(newFileName)
    }
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
  }

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
    }

    reader.readAsText(file)
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

  const Logo = () => {
    return (
      <Link href="/" className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20">
        <div className="h-6 w-6 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/30 flex-shrink-0" />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-semibold text-white whitespace-pre bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent"
        >
          C++ IDE
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
      href: "/",
      icon: <IconBrandTabler className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Profile",
      href: "#",
      icon: <IconUserBolt className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Dashboard",
      href: "/cpp",
      icon: <IconCode className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Dependencies",
      href: "/cpp/dependencies",
      icon: <IconPackage className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Templates",
      href: "/cpp/templates",
      icon: <IconTemplate className="text-purple-400 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Settings",
      href: "#",
      icon: <IconSettings className="text-purple-400 h-5 w-5 flex-shrink-0" />,
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
                className="rounded-lg py-3 px-4 bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-300 font-medium transition-all duration-200 border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                onClick={addFile}
                disabled={!compilerLoaded}
              >
                <IconFileDownload className="w-4 h-4" />
                <span className="text-sm">Add File</span>
              </button>

              <button
                className="rounded-lg py-3 px-4 bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 text-green-700 dark:text-green-300 font-medium transition-all duration-200 border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                onClick={runCode}
                disabled={!compilerLoaded || isCompiling || programRunning}
              >
                <IconPlayerPlayFilled className="w-4 h-4" />
                <span className="text-sm">
                  {isCompiling ? "Compiling..." : programRunning ? "Running..." : "Run File"}
                </span>
              </button>

              <button
                className="rounded-lg py-3 px-4 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 font-medium transition-all duration-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                onClick={handleExport}
                disabled={!compilerLoaded}
              >
                <IconFolderDown className="w-4 h-4" />
                <span className="text-sm">Export</span>
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
          </div>
        </div>
      </div>

      <div
        className="w-1 h-full bg-neutral-300 dark:bg-neutral-600 cursor-col-resize hover:bg-purple-500 dark:hover:bg-purple-500 transition-all duration-200"
        onMouseDown={handleMouseDown}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-[#1E1E1E]">
          <p
            className="ml-2 font-mono text-white"
            style={{
              fontFamily: "monospace",
            }}
          >
            {activeFile}
          </p>
        </div>
        <div className="flex-1">
          <MonacoEditor
            language="cpp"
            theme="vs-dark"
            value={files.find((f) => f.filename === activeFile)?.contents ?? ""}
            onChange={handleEditorChange}
            options={{ automaticLayout: true }}
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
          {outputLines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}

          {/* Input Field */}
          <div style={{ display: "flex", marginTop: "10px" }}>
            &gt;&nbsp;
            <input
              type="text"
              ref={inputFieldRef}
              disabled={!waitingForInput}
              onKeyDown={handleInputKeyDown}
              style={{
                width: "100%",
                backgroundColor: "transparent",
                color: "white",
                border: "none",
                outline: "none",
                fontFamily: "monospace",
              }}
              placeholder={waitingForInput ? "Enter your input and press Enter" : ""}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Editor
