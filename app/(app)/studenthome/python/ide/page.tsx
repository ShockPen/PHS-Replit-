'use client';
import { loadPyodide } from 'pyodide';
import { Sidebar, SidebarBody, SidebarLink } from "@/app/components/ui/sidebar";
import React, { MouseEventHandler, useEffect, useRef, useState } from 'react';
import {
    IconArrowLeft,
    IconBrandTabler,
    IconSettings,
    IconUserBolt,
    IconCoffee,
    IconPackage,
    IconTemplate,
    IconBrandPython,
    IconTerminal2,
    IconFolderDown,
    IconLoader,
    IconFileDownload,

    IconPlayerPlayFilled,
    IconCloudUpload,
    IconBrandGithub,
} from "@tabler/icons-react";
import {
    IconClipboardCopy,
    IconFileBroken,
    IconSignature,
    IconTableColumn,
    IconDeviceFloppy,
    IconFolderOpen,
    IconPlus,
    IconTrash,
    IconDownload,
    IconUpload,
    IconX,
    IconFile,
    IconFileText,
    IconPlayerPlay,
    IconPlayerStop,
} from "@tabler/icons-react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import { useSession } from "next-auth/react";
import Script from 'next/script';
import { useSearchParams } from "next/navigation";
import JSZip from 'jszip'; // Make sure this library is installed: npm install jszip
import { saveAs } from 'file-saver'; // npm install file-saver
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface File {
    id: string;
    filename: string;
    contents: string;
    language: string;
}

interface Project {
    project_name: string;
    files: File[];
}

interface OutputItem {
    text: string;
    type: 'output' | 'error' | 'system' | 'input';
    timestamp: string;
}

export default function Page() {
    // Enhanced state management
    const [files, setFiles] = useState<File[]>([{
        id: '1',
        filename: 'main.py',
        contents: `# Welcome to Python IDE
print("Hello, World!")
name = input("What's your name? ")
print(f"Nice to meet you, {name}!")

# You can import other files when you create them
# from utils import helper_function
`,
        language: 'python'
    }]);

    const [activeFileId, setActiveFileId] = useState('1');
    const [output, setOutput] = useState<OutputItem[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    // Input handling
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [inputPrompt, setInputPrompt] = useState('');
    const [userInput, setUserInput] = useState('');
    const [inputResolver, setInputResolver] = useState<((value: string) => void) | null>(null);

    // Pyodide
    const [pyodide, setPyodide] = useState<any>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // UI state
    const [showFileExplorer, setShowFileExplorer] = useState(true);
    const [showOutput, setShowOutput] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    // Project management
    const [currentProject, setCurrentProject] = useState('My Project');
    const [projectList, setProjectList] = useState<string[]>(['My Project']);

    // Sidebar state
    const [open, setOpen] = useState(false);

    // Session management
    const [signedIn, setSignedIn] = useState(false);
    const [name, setName] = useState('');
    const { data: session } = useSession();
    const searchParams = useSearchParams();

    // Refs
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize session
    useEffect(() => {
        if (session && (session.user.role === 'student' || session.user.role === 'educator')) {
            setSignedIn(true);
            setName(session.user.name || 'User');

            // Load projects and files
            loadUserProjects();
        }
    }, [session]);

    // Initialize Pyodide
    useEffect(() => {
        const initPyodide = async () => {
            try {
                if (typeof window !== 'undefined' && (window as any).loadPyodide) {
                    addToOutput('Initializing Python environment...', 'system');
                    const pyodideInstance = await (window as any).loadPyodide();

                    // Load common packages
                    await pyodideInstance.loadPackage(['numpy', 'matplotlib']);

                    // Setup custom input/output handling
                    setupPyodideIO(pyodideInstance);

                    setPyodide(pyodideInstance);
                    addToOutput('Python environment ready!', 'system');
                }
            } catch (error) {
                addToOutput(`Failed to initialize Python: ${error}`, 'error');
            }
        };

        initPyodide();
    }, []);

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    // Focus input when waiting
    useEffect(() => {
        if (isWaitingForInput && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isWaitingForInput]);

    // Utility functions
    const addToOutput = (text: string, type: OutputItem['type'] = 'output') => {
        setOutput(prev => [...prev, {
            text,
            type,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const clearOutput = () => {
        setOutput([]);
    };

    const getActiveFile = () => files.find(f => f.id === activeFileId);

    // Setup Pyodide input/output with proper synchronous behavior
    const setupPyodideIO = (pyodideInstance: any) => {
        // Create a promise-based input system
        (window as any).pythonInputPromise = null;
        (window as any).pythonInputResolver = null;

        // Custom output handler
        (window as any).addPythonOutput = (text: string, outputType: string) => {
            // Don't add empty lines unless they're intentional
            if (text.trim() || outputType === 'stdout') {
                addToOutput(text, outputType === 'stderr' ? 'error' : 'output');
            }
        };

        // Custom synchronous input handler
        (window as any).pythonInput = (prompt: string = '') => {
            return new Promise<string>((resolve) => {
                // Display the prompt immediately
                if (prompt) {
                    addToOutput(prompt, 'output');
                }

                // Set up the input state
                setInputPrompt(prompt);
                setInputResolver(() => resolve);
                setIsWaitingForInput(true);

                // Store the resolver globally for access
                (window as any).pythonInputResolver = resolve;
            });
        };

        // Set up Python environment with proper I/O redirection
        pyodideInstance.runPython(`
import sys
import asyncio
from js import pythonInput, addPythonOutput

# Custom stdout/stderr classes for real-time output
class PythonOutput:
    def __init__(self, output_type='stdout'):
        self.output_type = output_type
        self.buffer = ""

    def write(self, text):
        if text:
            # Handle both individual characters and full strings
            self.buffer += text
            # If we have a complete line or it's a flush, output it
            if '\\n' in text or text.endswith('\\n'):
                lines = self.buffer.split('\\n')
                for i, line in enumerate(lines[:-1]):  # All but the last
                    if line or i == 0:  # Keep first line even if empty, skip other empty lines
                        addPythonOutput(line, self.output_type)
                self.buffer = lines[-1]  # Keep remainder
            elif len(self.buffer) > 100:  # Flush long buffers
                addPythonOutput(self.buffer, self.output_type)
                self.buffer = ""

    def flush(self):
        if self.buffer:
            addPythonOutput(self.buffer, self.output_type)
            self.buffer = ""

# Replace stdout and stderr
sys.stdout = PythonOutput('stdout')
sys.stderr = PythonOutput('stderr')

# Create a synchronous input function that works with asyncio
def sync_input(prompt=""):
    # This creates a coroutine that can be awaited
    async def _async_input():
        try:
            result = await pythonInput(str(prompt))
            return result
        except Exception as e:
            print(f"Input error: {e}")
            return ""
    
    # Run the async function in the current event loop
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a task
            task = asyncio.create_task(_async_input())
            return task
        else:
            # If not in async context, run until complete
            return loop.run_until_complete(_async_input())
    except:
        # Fallback - return the coroutine directly
        return _async_input()

# Override the built-in input function
setattr(__builtins__, "input", sync_input)

# Test function to verify setup
def test_io():
    print("I/O system initialized successfully")
        `);
    };

    // File management functions
    const updateFileContent = (content: string) => {
        setFiles(prev => prev.map(f =>
            f.id === activeFileId ? { ...f, contents: content } : f
        ));
    };

    const createNewFile = () => {
        const newId = Date.now().toString();
        const newFile: File = {
            id: newId,
            filename: 'untitled.py',
            contents: '# New Python file\n',
            language: 'python'
        };
        setFiles(prev => [...prev, newFile]);
        setActiveFileId(newId);
    };

    const deleteFile = (fileId: string) => {
        if (files.length <= 1) {
            addToOutput('Cannot delete the last file', 'error');
            return;
        }

        setFiles(prev => prev.filter(f => f.id !== fileId));
        if (activeFileId === fileId) {
            const remainingFiles = files.filter(f => f.id !== fileId);
            setActiveFileId(remainingFiles[0]?.id || files[0].id);
        }
        addToOutput('File deleted', 'system');
    };

    const renameFile = (fileId: string, newName: string) => {
        if (!newName.trim()) return;

        setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, filename: newName } : f
        ));
    };

    // Project management functions
    const saveProject = async () => {
        try {
            if (signedIn) {
                // Save to backend
                const response = await fetch('/api/student/save_files/post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project: currentProject,
                        files: files.map(f => ({
                            filename: f.filename,
                            contents: f.contents
                        }))
                    })
                });

                if (response.ok) {
                    addToOutput(`Project "${currentProject}" saved to server`, 'system');
                } else {
                    throw new Error('Failed to save to server');
                }
            } else {
                // Save locally using in-memory storage
                const projectData = {
                    name: currentProject,
                    files: files,
                    timestamp: new Date().toISOString()
                };
                // Store in a global variable for the session
                (window as any).localProjects = (window as any).localProjects || {};
                (window as any).localProjects[currentProject] = projectData;
                addToOutput(`Project "${currentProject}" saved locally`, 'system');
            }
        } catch (error) {
            addToOutput(`Failed to save project: ${error}`, 'error');
        }
    };

    const loadProject = async (projectName: string) => {
        try {
            if (signedIn) {
                // Load from backend
                const response = await fetch('/api/student/get_files/post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_name: projectName })
                });

                const data = await response.json();
                if (data.project) {
                    const loadedFiles = data.project.files.map((f: any, index: number) => ({
                        id: (index + 1).toString(),
                        filename: f.filename,
                        contents: f.contents,
                        language: 'python'
                    }));
                    setFiles(loadedFiles);
                    setActiveFileId(loadedFiles[0]?.id || '1');
                    setCurrentProject(projectName);
                    addToOutput(`Project "${projectName}" loaded from server`, 'system');
                } else {
                    throw new Error('Project not found on server');
                }
            } else {
                // Load from session storage
                const localProjects = (window as any).localProjects || {};
                if (localProjects[projectName]) {
                    const projectData = localProjects[projectName];
                    setFiles(projectData.files);
                    setActiveFileId(projectData.files[0]?.id || '1');
                    setCurrentProject(projectName);
                    addToOutput(`Project "${projectName}" loaded locally`, 'system');
                } else {
                    throw new Error('Project not found locally');
                }
            }
        } catch (error) {
            addToOutput(`Failed to load project: ${error}`, 'error');
        }
    };

    const loadUserProjects = async () => {
        try {
            if (signedIn) {
                const response = await fetch('/api/student/get_projectlist/post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                if (data.python_project_names) {
                    setProjectList(data.python_project_names);
                }
            } else {
                // Load from session storage
                const localProjects = (window as any).localProjects || {};
                const savedProjects = Object.keys(localProjects);
                setProjectList(savedProjects.length > 0 ? savedProjects : ['My Project']);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const exportProject = async () => {
        if (files.length === 1) {
            const file = files[0];
            const blob = new Blob([file.contents], { type: 'text/x-python' });
            saveAs(blob, `${file.filename || currentProject}.py`);
            addToOutput(`File exported as ${file.filename || currentProject}.py`, 'system');
        } else {
            const zip = new JSZip();
            const metadata = {
                name: currentProject,
                timestamp: new Date().toISOString(),
                files: files.map(f => ({ id: f.id, name: f.filename }))
            };
            zip.file('project.json', JSON.stringify(metadata, null, 2));
            files.forEach(file => {
                zip.file(file.filename, file.contents);
            });

            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, `${currentProject}.zip`);
            addToOutput(`Project exported as ${currentProject}.zip`, 'system');
        }
    };

    const importProject = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const isZip = file.name.endsWith('.zip');
        const isPy = file.name.endsWith('.py');

        if (isZip) {
            const zip = new JSZip();
            zip.loadAsync(file).then(async (unzipped: JSZip) => {
                const metadataFile = unzipped.file('project.json');
                if (!metadataFile) throw new Error('Missing project.json');

                const metadata = JSON.parse(await metadataFile.async('string'));
                const loadedFiles = await Promise.all(
                    metadata.files.map(async (meta: { id: string, name: string }) => {
                        const content = await unzipped.file(meta.name)?.async('string');
                        return { id: meta.id, name: meta.name, content };
                    })
                );

                setFiles(loadedFiles);
                setCurrentProject(metadata.name);
                setActiveFileId(loadedFiles[0]?.id || '1');
                if (!projectList.includes(metadata.name)) {
                    setProjectList(prev => [...prev, metadata.name]);
                }
                addToOutput(`Project "${metadata.name}" imported successfully`, 'system');
            }).catch((error: any) => {
                addToOutput(`Failed to import project: ${error}`, 'error');
            });
        } else if (isPy) {
            const reader = new FileReader();
            reader.onload = () => {
                const content = reader.result as string;
                const newFile: File = {
                    id: '1',
                    filename: file.name,
                    contents: content,
                    language: 'python'
                };

                setFiles([newFile]);
                setCurrentProject(file.name.replace('.py', ''));
                setActiveFileId('1');
                if (!projectList.includes(currentProject)) {
                    setProjectList(prev => [...prev, currentProject]);
                }
                addToOutput(`File "${file.name}" imported successfully`, 'system');
            };
            reader.readAsText(file);
        } else {
            addToOutput('Unsupported file type for import', 'error');
        }
    };

    // Enhanced code execution with proper synchronous behavior
    const runCode = async () => {
        if (!pyodide) {
            addToOutput('Python environment not ready yet...', 'error');
            return;
        }

        if (isExecuting) {
            addToOutput('Code is already running...', 'error');
            return;
        }

        const activeFile = getActiveFile();
        if (!activeFile) {
            addToOutput('No active file to run', 'error');
            return;
        }

        setIsRunning(true);
        setIsExecuting(true);
        addToOutput(`Running ${activeFile.filename}...`, 'system');

        try {
            // Clear any previous state
            setIsWaitingForInput(false);
            setInputResolver(null);

            // Clear the Pyodide filesystem and modules
            try {
                pyodide.runPython(`
import sys
import os

# Clear user modules (keep system modules)
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
                `);
            } catch (e) {
                // Ignore cleanup errors
            }

            // Create virtual files for all Python files
            for (const file of files) {
                if (file.filename.endsWith('.py')) {
                    pyodide.FS.writeFile(`/${file.filename}`, file.contents);
                }
            }

            // Add current directory to Python path
            pyodide.runPython(`
import sys
if '/' not in sys.path:
    sys.path.insert(0, '/')
            `);

            // Execute the code with proper async handling
            await pyodide.runPythonAsync(activeFile.contents);

            // Flush any remaining output
            pyodide.runPython(`
import sys
sys.stdout.flush()
sys.stderr.flush()
            `);

            if (!isWaitingForInput) {
                addToOutput('Execution completed', 'system');
            }

        } catch (error) {
            let errorMessage = 'Unknown error occurred';

            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object' && 'toString' in error) {
                errorMessage = error.toString();
            }

            // Clean up the error message for better readability
            errorMessage = errorMessage.replace(/File "\/.*?", /g, '');
            addToOutput(`Error: ${errorMessage}`, 'error');
        } finally {
            setIsRunning(false);
            setIsExecuting(false);
        }
    };

    const stopExecution = () => {
        setIsRunning(false);
        setIsExecuting(false);
        setIsWaitingForInput(false);
        setInputResolver(null);
        setInputPrompt('');
        addToOutput('Execution stopped', 'system');
    };

    // Enhanced input handling
    const handleInputSubmit = () => {
        if (isWaitingForInput && inputResolver) {
            // Display the user input in the output
            addToOutput(userInput, 'input');

            // Resolve the promise with the user input
            inputResolver(userInput);

            // Reset input state
            setUserInput('');
            setIsWaitingForInput(false);
            setInputResolver(null);
            setInputPrompt('');
        }
    };

    // File upload handler
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target?.result as string;
            const newFile = {
                id: Date.now().toString(),
                filename: file.name,
                contents,
                language: file.name.endsWith('.py') ? 'python' : 'text'
            };
            setFiles(prev => [...prev, newFile]);
            setActiveFileId(newFile.id);
            addToOutput(`File "${file.name}" uploaded`, 'system');
        };
        reader.readAsText(file);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore shortcuts when input is focused or waiting for input
            if (isWaitingForInput || (e.target as HTMLElement)?.tagName === 'INPUT') {
                return;
            }

            if (e.key === 'F5') {
                e.preventDefault();
                runCode();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveProject();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isWaitingForInput]);

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
    ];

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
    );

    const LogoIcon = () => (
        <Link href="#" className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20">
            <div className="h-6 w-6 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-lg shadow-lg shadow-orange-500/30 flex-shrink-0" />
        </Link>
    );

    return (
        <>
            <Script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js" strategy="beforeInteractive" />

            <div className="flex h-screen bg-gray-900">
                {/* Sidebar */}
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
                                                className="h-7 w-7 flex-shrink-0 rounded-full border border-blue-400"
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

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Top Toolbar */}
                    <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <IconBrandPython className="w-6 h-6 text-blue-400" />
                                <span className="font-semibold text-lg text-white">Python IDE</span>
                            </div>

                            <div className="h-6 w-px bg-gray-600" />

                            <select
                                value={currentProject}
                                onChange={(e) => {
                                    const newProject = e.target.value;
                                    if (newProject !== currentProject) {
                                        loadProject(newProject);
                                    }
                                }}
                                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white"
                            >
                                {projectList.map(project => (
                                    <option key={project} value={project}>{project}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={isRunning ? stopExecution : runCode}
                                disabled={!pyodide}
                                className={`px-4 py-2 rounded flex items-center space-x-2 transition-colors ${
                                    !pyodide
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : isRunning
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-green-600 hover:bg-green-700'
                                }`}
                                title={isRunning ? "Stop Execution" : "Run Code (F5)"}
                            >
                                {isRunning ? <IconPlayerStop className="w-4 h-4" /> : <IconPlayerPlay className="w-4 h-4" />}
                                <span>{isRunning ? 'Stop' : 'Run'}</span>
                            </button>

                            <button
                                onClick={saveProject}
                                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded transition-colors"
                                title="Save Project (Ctrl+S)"
                            >
                                <IconDeviceFloppy className="w-4 h-4" />
                            </button>

                            <input
                                type="file"
                                accept=".json"
                                onChange={importProject}
                                className="hidden"
                                id="import-project"
                            />
                            <label
                                htmlFor="import-project"
                                className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded cursor-pointer transition-colors"
                                title="Import Project"
                            >
                                <IconUpload className="w-4 h-4" />
                            </label>

                            <button
                                onClick={exportProject}
                                className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded transition-colors"
                                title="Export Project"
                            >
                                <IconDownload className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded transition-colors"
                                title="Settings"
                            >
                                <IconSettings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* File Explorer */}
                        {showFileExplorer && (
                            <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
                                <div className="p-3 border-b border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-300">Files</h3>
                                        <div className="flex space-x-1">
                                            <button
                                                onClick={createNewFile}
                                                className="text-green-400 hover:bg-gray-700 p-1 rounded"
                                                title="New File"
                                            >
                                                <IconPlus className="w-4 h-4" />
                                            </button>
                                            <input
                                                type="file"
                                                accept=".py,.txt"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                id="upload-file"
                                            />
                                            <label
                                                htmlFor="upload-file"
                                                className="text-blue-400 hover:bg-gray-700 p-1 rounded cursor-pointer"
                                                title="Upload File"
                                            >
                                                <IconUpload className="w-4 h-4" />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2">
                                    {files.map((file) => (
                                        <div
                                            key={file.id}
                                            className={`flex items-center justify-between p-2 rounded mb-1 cursor-pointer group ${
                                                activeFileId === file.id ? 'bg-blue-600' : 'hover:bg-gray-700'
                                            }`}
                                            onClick={() => setActiveFileId(file.id)}
                                        >
                                            <div className="flex items-center space-x-2 flex-1">
                                                <IconFileText className="w-4 h-4 text-blue-400" />
                                                <input
                                                    type="text"
                                                    value={file.filename}
                                                    onChange={(e) => renameFile(file.id, e.target.value)}
                                                    className="bg-transparent text-sm flex-1 outline-none text-white"
                                                    onBlur={(e) => {
                                                        if (!e.target.value.trim()) {
                                                            renameFile(file.id, 'untitled.py');
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>

                                            {files.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteFile(file.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-600 hover:text-white p-1 rounded transition-all"
                                                    title="Delete File"
                                                >
                                                    <IconTrash className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Main Editor Area */}
                        <div className="flex-1 flex flex-col">
                            {/* Editor Tabs */}
                            <div className="bg-gray-800 border-b border-gray-700 flex overflow-x-auto">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className={`px-4 py-2 border-r border-gray-700 cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
                                            activeFileId === file.id ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        }`}
                                        onClick={() => setActiveFileId(file.id)}
                                    >
                                        <IconFile className="w-4 h-4" />
                                        <span className="text-sm">{file.filename}</span>
                                        {files.length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteFile(file.id);
                                                }}
                                                className="text-gray-500 hover:text-red-400 ml-2"
                                            >
                                                <IconX className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Code Editor */}
                            <div className="flex-1">
                                <MonacoEditor
                                    height="100%"
                                    language="python"
                                    theme="vs-dark"
                                    value={getActiveFile()?.contents || ''}
                                    onChange={(value) => updateFileContent(value || '')}
                                    options={{
                                        automaticLayout: true,
                                        fontSize: 14,
                                        lineNumbers: 'on',
                                        minimap: { enabled: true },
                                        wordWrap: 'on',
                                        tabSize: 4,
                                        insertSpaces: true
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Output Panel */}
                    {showOutput && (
                        <div className="h-64 bg-black border-t border-gray-700 flex flex-col">
                            <div className="bg-gray-800 p-2 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <h3 className="font-semibold text-sm text-white">Output</h3>
                                    <button
                                        onClick={clearOutput}
                                        className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowOutput(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <IconX className="w-4 h-4" />
                                </button>
                            </div>

                            <div ref={outputRef} className="flex-1 overflow-y-auto p-3 font-mono text-sm">
                                {output.map((item, index) => (
                                    <div
                                        key={index}
                                        className={`mb-1 ${
                                            item.type === 'error' ? 'text-red-400' :
                                                item.type === 'system' ? 'text-yellow-400' :
                                                    item.type === 'input' ? 'text-green-400' : 'text-white'
                                        }`}
                                    >
                                        {item.type === 'system' && <span className="text-gray-500">[{item.timestamp}] </span>}
                                        <span className="whitespace-pre-wrap">{item.text}</span>
                                    </div>
                                ))}

                                {/* Input field when waiting for user input */}
                                {isWaitingForInput && (
                                    <div className="flex items-center mt-2">
                                        <span className="text-green-400 mr-2">{">"}</span>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleInputSubmit();
                                                }
                                            }}
                                            className="flex-1 bg-transparent text-white outline-none font-mono"
                                            placeholder="Enter input and press Enter..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Settings Modal */}
                    {showSettings && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-gray-800 rounded-lg p-6 w-96">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-white">Settings</h3>
                                    <button
                                        onClick={() => setShowSettings(false)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <IconX className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-white">Show File Explorer</label>
                                        <input
                                            type="checkbox"
                                            checked={showFileExplorer}
                                            onChange={(e) => setShowFileExplorer(e.target.checked)}
                                            className="rounded"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-white">Show Output Panel</label>
                                        <input
                                            type="checkbox"
                                            checked={showOutput}
                                            onChange={(e) => setShowOutput(e.target.checked)}
                                            className="rounded"
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-gray-700">
                                        <button
                                            onClick={() => {
                                                localStorage.clear();
                                                addToOutput('Local storage cleared', 'system');
                                                setShowSettings(false);
                                            }}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                                        >
                                            Clear Local Storage
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
