"use client";

import React, { MouseEventHandler, useEffect, useRef, useState, useCallback } from 'react';
import {
    IconPackage,
    IconBrandPython,
    IconTerminal2,
    IconFolder,
    IconFile,
    IconFileText,
    IconPlayerPlayFilled,
    IconDeviceFloppy,
    IconCode,
    IconRefresh,
    IconPlus,
    IconTrash,
    IconSearch,
    IconEye,
    IconEyeOff,
    IconX,
    IconMenu2,
} from "@tabler/icons-react";
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";

// Import the Sidebar components
import {
    SidebarProvider,
    Sidebar,
    SidebarBody,
    DesktopSidebar,
    MobileSidebar,
    SidebarLink,
    SidebarButton,
    useSidebar // Import useSidebar if you need to control sidebar from within its children
} from "@/app/components/ui/sidebar"; // Adjust this path if your sidebar.tsx is elsewhere

// Dynamically import Monaco Editor for client-side only
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

//Declarations
declare global {
    interface Window {
        loadPyodide: (options: { indexURL: string }) => Promise<any>;
        addConsoleOutput: (type: string, content: string) => void;
        handlePythonInput: (prompt: string) => Promise<string>;
    }
}

// Interfaces
interface File {
    filename: string;
    contents: string;
    type: 'python' | 'text' | 'json' | 'markdown' | 'html' | 'css' | 'javascript';
    path: string;
    isModified?: boolean;
    lastModified?: number;
}

interface ConsoleOutput {
    type: 'stdout' | 'stderr' | 'input' | 'system' | 'warning' | 'info';
    content: string;
    timestamp: number;
}

interface TabItem {
    path: string;
    filename: string;
    isModified: boolean;
    type: File['type'];
}

interface Bookmark {
    id: string;
    path: string;
    line: number;
    description: string;
}

// Enhanced File System Manager
class VirtualFileSystem {
    private files: Map<string, File> = new Map();
    private pyodide: any = null;
    private watchers: Set<() => void> = new Set();
    private isClient: boolean = false;

    constructor() {
        this.isClient = typeof window !== 'undefined';
        if (this.isClient) {
            this.loadFromStorage();
        }
    }

    addWatcher(callback: () => void) {
        this.watchers.add(callback);
        return () => this.watchers.delete(callback);
    }

    private notifyWatchers() {
        this.watchers.forEach(callback => callback());
    }

    setPyodide(pyodide: any) {
        this.pyodide = pyodide;
    }

    createFile(path: string, contents: string = '', type: File['type'] = 'python'): File {
        const file: File = {
            filename: path.split('/').pop() || 'untitled.py',
            contents,
            type,
            path,
            isModified: false,
            lastModified: Date.now()
        };
        this.files.set(path, file);
        this.saveToStorage();
        this.syncToPyodide(path, contents);
        this.notifyWatchers();
        return file;
    }

    getFile(path: string): File | undefined {
        return this.files.get(path);
    }

    updateFile(path: string, contents: string): void {
        const file = this.files.get(path);
        if (file) {
            const wasModified = file.contents !== contents;
            file.contents = contents;
            file.isModified = wasModified;
            file.lastModified = Date.now();
            this.files.set(path, file);
            this.saveToStorage();
            this.syncToPyodide(path, contents);
            this.notifyWatchers();
        }
    }

    markFileSaved(path: string): void {
        const file = this.files.get(path);
        if (file) {
            file.isModified = false;
            this.files.set(path, file);
            this.saveToStorage();
            this.notifyWatchers();
        }
    }

    deleteFile(path: string): boolean {
        const deleted = this.files.delete(path);
        if (deleted) {
            this.saveToStorage();
            this.removeFromPyodide(path);
            this.notifyWatchers();
        }
        return deleted;
    }

    getAllFiles(): File[] {
        return Array.from(this.files.values()).sort((a, b) => a.filename.localeCompare(b.filename));
    }

    searchFiles(query: string): File[] {
        const searchTerm = query.toLowerCase();
        return this.getAllFiles().filter(file =>
            file.filename.toLowerCase().includes(searchTerm) ||
            file.contents.toLowerCase().includes(searchTerm)
        );
    }

    private syncToPyodide(path: string, contents: string): void {
        if (this.pyodide && this.pyodide.FS) { // ADDED this.pyodide.FS check
            try {
                const dir = path.substring(0, path.lastIndexOf('/'));
                if (dir && !this.pyodide.FS.analyzePath(dir).exists) {
                    this.pyodide.FS.mkdirTree(dir);
                }
                this.pyodide.FS.writeFile(path, contents, { encoding: 'utf8' });
            } catch (error) {
                console.warn('Failed to sync to Pyodide FS:', error);
            }
        } else {
            console.warn('Pyodide or its FS not ready for sync. Skipping file write:', path);
        }
    }

    private removeFromPyodide(path: string): void {
        if (this.pyodide && this.pyodide.FS) { // ADDED this.pyodide.FS check
            try {
                this.pyodide.FS.unlink(path);
            } catch (error) {
                console.warn('Failed to remove from Pyodide FS:', error);
            }
        }
    }

    private saveToStorage(): void {
        if (!this.isClient) return;
        try {
            const serializedFiles = JSON.stringify(Array.from(this.files.entries()));
            localStorage.setItem('python_ide_files', serializedFiles);
        } catch (error) {
            console.error('Failed to save files to storage:', error);
        }
    }

    private loadFromStorage(): void {
        if (!this.isClient) return;
        try {
            const stored = localStorage.getItem('python_ide_files');
            if (stored) {
                const entries = JSON.parse(stored);
                this.files = new Map(entries);
            }
        } catch (error) {
            console.error('Failed to load files from storage:', error);
        }
    }

    initializePyodideFS(): void {
        if (!this.pyodide || !this.pyodide.FS) { // ADDED this.pyodide.FS check
            console.warn('Pyodide or its FS not ready for initialization. Skipping FS sync.');
            return;
        }

        try {
            const currentPyodideFiles = this.pyodide.FS.readdir('/').filter((name: string) => name !== '.' && name !== '..');
            for (const item of currentPyodideFiles) {
                try {
                    if (this.pyodide.FS.stat('/' + item).isDirectory()) {
                        this.pyodide.FS.rmdir('/' + item);
                    } else {
                        this.pyodide.FS.unlink('/' + item);
                    }
                } catch (e) {
                    // Ignore errors for system files
                }
            }
        } catch (e) {
            console.warn("Could not clear Pyodide FS:", e);
        }

        for (const [path, file] of this.files) {
            this.syncToPyodide(path, file.contents);
        }
    }
}

export default function PythonIDEPage() {
    // Core state
    const [pyodide, setPyodide] = useState<any>(null);
    const [pyodideLoading, setPyodideLoading] = useState(true);
    const [code, setCode] = useState('# Welcome to Python IDE\n# This is a professional Python development environment\nprint("Hello, World!")');
    const [activeFile, setActiveFile] = useState<string>('main.py');
    const [consoleOutput, setConsoleOutput] = useState<ConsoleOutput[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);

    // File system and tabs
    const [fileSystem] = useState(() => new VirtualFileSystem());
    const [files, setFiles] = useState<File[]>([]);
    const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
    const [showFileDialog, setShowFileDialog] = useState(false);
    const [newFileName, setNewFileName] = useState('');

    // Input handling
    const [inputResolver, setInputResolver] = useState<((value: string) => void) | null>(null);
    const [currentInput, setCurrentInput] = useState('');
    const [inputPrompt, setInputPrompt] = useState('');
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);

    // UI state
    const [sidebarOpen, setSidebarOpen] = useState(true); // Control for our custom sidebar
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [currentView, setCurrentView] = useState<'files' | 'search' | 'git' | 'packages'>('files');
    const [consoleHeight, setConsoleHeight] = useState(200);
    const [showConsole, setShowConsole] = useState(true);
    const [fontSize, setFontSize] = useState(14);
    const [wordWrap, setWordWrap] = useState(true);
    const [minimap, setMinimap] = useState(false);

    // Search and replace
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showReplace, setReplaceQueryState] = useState(false); // Renamed to avoid conflict

    // Bookmarks
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

    // Package management
    const [packages, setPackages] = useState<string[]>([]);
    const [packageToInstall, setPackageToInstall] = useState('');
    const [installingPackage, setInstallingPackage] = useState(false);

    // Refs
    const inputFieldRef = useRef<HTMLInputElement>(null);
    const consoleRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);
    const isConsoleResizing = useRef(false);
    const editorRef = useRef<any>(null);
    const pyodideScriptAddedRef = useRef(false); // ADDED: Ref to track if Pyodide script has already been added to the DOM

    // Auto-scroll console to bottom
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [consoleOutput]);

    // File system watcher
    useEffect(() => {
        const unwatch = fileSystem.addWatcher(() => {
            setFiles(fileSystem.getAllFiles());
        });
        return () => {
            unwatch();
        };
    }, [fileSystem]);

    // Console output handler - declared before setupPythonEnvironment
    const addConsoleOutput = useCallback((type: string, content: string) => {
        if (content === 'clear') {
            setConsoleOutput([]);
            return;
        }

        setConsoleOutput((prev) => {
            const newEntry = {
                type: type as ConsoleOutput['type'],
                content,
                timestamp: Date.now()
            };
            return [...prev.slice(-999), newEntry]; // Keep last 1000 entries
        });
    }, []);

    // Python input handler (to bridge Python's input() with JS) - declared before setupPythonEnvironment
    const handlePythonInput = useCallback((prompt: string): Promise<string> => {
        return new Promise<string>((resolve) => {
            setInputPrompt(prompt);
            setIsWaitingForInput(true);
            setInputResolver(() => resolve);

            // Focus input field after state update
            setTimeout(() => {
                if (inputFieldRef.current) {
                    inputFieldRef.current.focus();
                }
            }, 100);
        });
    }, []);

    // Pyodide environment setup - declared before useEffect that uses it
    const setupPythonEnvironment = useCallback(async (pyodideInstance: any) => {
        addConsoleOutput('system', 'Step 3: Setting up Python environment within Pyodide...');
        (window as any).addConsoleOutput = addConsoleOutput;
        (window as any).handlePythonInput = handlePythonInput;

        try {
            await pyodideInstance.runPythonAsync(`
# Python environment setup starts
import sys
import builtins
import js
import asyncio
import io
import traceback
from datetime import datetime
import inspect

# These next lines are crucial for connecting Python print/input to JS console
class IDEStdout(io.TextIOBase):
    def __init__(self):
        self._buffer = []
    def write(self, text):
        if text and text.strip():
            js.addConsoleOutput('stdout', text.rstrip())
        return len(text)
    def flush(self):
        pass

class IDEStderr(io.TextIOBase):
    def __init__(self):
        self._buffer = []
    def write(self, text):
        if text and text.strip():
            js.addConsoleOutput('stderr', text.rstrip())
        return len(text)
    def flush(self):
        pass

sys.stdout = IDEStdout()
sys.stderr = IDEStderr()

def run_async_js(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

def ide_input(prompt=""):
    if prompt:
        js.addConsoleOutput('input', prompt)
    result = run_async_js(js.handlePythonInput(prompt))
    return result

builtins.input = ide_input

def execute_code_clean(code_str):
    import ast
    try:
        mod = ast.parse(code_str)
        last_expr = mod.body[-1] if mod.body else None
        can_eval_last = isinstance(last_expr, ast.Expr)
        contains_async = any(isinstance(node, (ast.AsyncFunctionDef, ast.Await)) for node in ast.walk(mod))
        exec_globals = globals()

        if contains_async:
            async_wrapper_lines = []
            if can_eval_last:
                body_lines = code_str.splitlines()[:-1]
                last_line = code_str.splitlines()[-1]
                async_wrapper_lines.extend(f"    {line}" for line in body_lines)
                async_wrapper_lines.append(f"    __result__ = {last_line}")
                async_wrapper_lines.append("    if inspect.isawaitable(__result__):")
                async_wrapper_lines.append("        __result__ = await __result__")
                async_wrapper_lines.append("    if __result__ is not None:")
                async_wrapper_lines.append("        print(__result__)")
            else:
                async_wrapper_lines.extend(f"    {line}" for line in code_str.splitlines())
            async_code = (
                "async def __user_code_runner__():\\n"
                + "\\n".join(async_wrapper_lines)
                + "\\n\\nimport asyncio\\nasyncio.run(__user_code_runner__())"
            )
            exec(async_code, exec_globals)
        else:
            if can_eval_last:
                body_code = "\\n".join(code_str.splitlines()[:-1])
                last_line = code_str.splitlines()[-1]
                exec(body_code, exec_globals)
                result = eval(last_line, exec_globals)
                if result is not None:
                    print(result)
            else:
                exec(code_str, exec_globals)

    except SyntaxError as e:
        error_msg = f"SyntaxError on line {e.lineno}: {e.msg}"
        sys.stderr.write(error_msg)
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        sys.stderr.write(error_msg)
        sys.stderr.write(traceback.format_exc())

globals()['execute_code_clean'] = execute_code_clean

def help():
    help_text = """Python IDE Help
===============
Available commands:
- help(): Show this help
- clear(): Clear console
- input(): Get user input
- print(): Display output

Pre-installed: numpy, pandas, matplotlib
Use: import micropip; await micropip.install('package') for more packages"""
    print(help_text)

def clear():
    js.addConsoleOutput('system', 'clear')

builtins.help = help
builtins.clear = clear
            `);
            addConsoleOutput('system', 'Step 3.1: Python environment setup complete.');
        } catch (error) {
            console.error('Error during setupPythonEnvironment.runPythonAsync:', error);
            addConsoleOutput('stderr', `Error configuring Python environment: ${error}`);
            throw error; // Re-throw to be caught by outer loadAndSetupPyodide
        }
    }, [addConsoleOutput, handlePythonInput]);


    // Pyodide initialization - NOW WITH MORE DEBUGGING
    useEffect(() => {
        const loadAndSetupPyodide = async (pyodideInstance: any) => {
            try {
                addConsoleOutput('system', 'Step 2: Pyodide instance loaded. Loading packages...');
                // Crucial check: Ensure Pyodide instance and its FS are fully ready
                if (!pyodideInstance || !pyodideInstance.FS) {
                    addConsoleOutput('stderr', 'Pyodide instance or its file system (FS) is not available during setup.');
                    setPyodideLoading(false); // Ensure loading state is turned off
                    return;
                }

                await pyodideInstance.loadPackage(['numpy', 'micropip', 'matplotlib', 'pandas']);
                addConsoleOutput('system', 'Step 2.1: Packages loaded. Running Python environment setup...');
                await setupPythonEnvironment(pyodideInstance);

                // Another check after setupEnvironment to be safe, though it should be fine
                if (!pyodideInstance.FS) {
                    addConsoleOutput('stderr', 'Pyodide FS is still not available after environment setup.');
                    setPyodideLoading(false); // Ensure loading state is turned off
                    return;
                }
                addConsoleOutput('system', 'Step 4: Syncing file system...');
                fileSystem.setPyodide(pyodideInstance);
                fileSystem.initializePyodideFS(); // This uses pyodideInstance.FS

                setPyodide(pyodideInstance);
                addConsoleOutput('system', 'Python environment ready!');
            } catch (error) {
                console.error('Error during Pyodide load/setup:', error);
                addConsoleOutput('stderr', `Error setting up Python environment: ${error}`);
            } finally {
                setPyodideLoading(false); // ALWAYS turn off loading state
            }
        };

        const initializePyodide = async () => {
            // Prevent re-initialization if already loaded or in the process of loading
            if (pyodide || pyodideLoading) {
                addConsoleOutput('system', '🐍 Pyodide already loaded or loading. Skipping re-initialization.');
                return;
            }

            setPyodideLoading(true);
            addConsoleOutput('system', 'Step 1: Checking for Pyodide script...');

            // Only add the script once. Use a ref to prevent multiple script injections.
            if (!pyodideScriptAddedRef.current && !window.loadPyodide) {
                addConsoleOutput('system', 'Step 1.1: Pyodide script not found in window. Loading script...');
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js';
                script.async = true; // Make script loading non-blocking
                script.onload = async () => {
                    addConsoleOutput('system', 'Step 1.2: Pyodide script loaded. Attempting to initialize Pyodide...');
                    if (window.loadPyodide) {
                        try {
                            const pyodideInstance = await window.loadPyodide({
                                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.1/full/',
                            });
                            await loadAndSetupPyodide(pyodideInstance);
                        } catch (e) {
                            console.error('Error during pyodide.js onload initialization:', e);
                            addConsoleOutput('stderr', `Failed to initialize Pyodide after script load: ${e}`);
                            setPyodideLoading(false);
                        }
                    } else {
                        addConsoleOutput('stderr', 'window.loadPyodide not found after script loaded. This indicates a problem with Pyodide itself.');
                        setPyodideLoading(false);
                    }
                };
                script.onerror = (e) => {
                    console.error('Failed to load Pyodide script:', e);
                    addConsoleOutput('stderr', 'Failed to load Pyodide script');
                    setPyodideLoading(false);
                };
                document.head.appendChild(script);
                pyodideScriptAddedRef.current = true; // Mark script as added
            } else if (window.loadPyodide && !pyodide) {
                // If script was loaded previously (e.g., via fast refresh) but pyodide state not set
                addConsoleOutput('system', 'Step 1.3: Pyodide script already loaded, but instance not set. Attempting direct load...');
                try {
                    const pyodideInstance = await window.loadPyodide({
                        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.1/full/',
                    });
                    await loadAndSetupPyodide(pyodideInstance);
                } catch (e) {
                    console.error('Error during direct Pyodide load:', e);
                    addConsoleOutput('stderr', `Failed to re-initialize Pyodide directly: ${e}`);
                    setPyodideLoading(false);
                }
            } else {
                addConsoleOutput('system', 'Pyodide state inconsistent. Turning off loading indicator to avoid infinite loop.');
                setPyodideLoading(false); // Ensure loading state is turned off as a fallback
            }
        };

        initializePyodide();
    }, [pyodide, pyodideLoading, addConsoleOutput, fileSystem, setupPythonEnvironment]); // Dependencies for this useEffect


    // Initialize files
    useEffect(() => {
        // Only run if Pyodide is ready (not loading, not null) AND files haven't been initialized
        if (!pyodideLoading && pyodide && files.length === 0) {
            const existingFiles = fileSystem.getAllFiles();
            if (existingFiles.length === 0) {
                const defaultFile = fileSystem.createFile('main.py', code, 'python');
                setFiles([defaultFile]);
                setActiveFile(defaultFile.path);
                setOpenTabs([{ path: defaultFile.path, filename: defaultFile.filename, isModified: false, type: defaultFile.type }]);
            } else {
                setFiles(existingFiles);
                const firstFile = existingFiles[0];
                setActiveFile(firstFile.path);
                setCode(firstFile.contents);
                setOpenTabs([{ path: firstFile.path, filename: firstFile.filename, isModified: firstFile.isModified || false, type: firstFile.type }]);
            }
        }
    }, [pyodide, pyodideLoading, fileSystem, code]); // Added pyodide to ensure it's ready

    // Update editor when active file changes
    useEffect(() => {
        if (activeFile) {
            const file = fileSystem.getFile(activeFile);
            if (file) {
                setCode(file.contents);
            }
        }
    }, [activeFile, fileSystem]);

    const handleInputSubmit = () => {
        if (inputResolver) {
            addConsoleOutput('input', `> ${currentInput}`);
            inputResolver(currentInput);
            setCurrentInput('');
            setInputResolver(null);
            setIsWaitingForInput(false);
            setInputPrompt('');
        }
    };

    const executeCode = async () => {
        if (!pyodide || isExecuting) return;

        setIsExecuting(true);

        try {
            // Ensure all open tabs' content is saved to file system before execution
            for (const tab of openTabs) {
                const file = fileSystem.getFile(tab.path);
                if (file && tab.path === activeFile) {
                    fileSystem.updateFile(tab.path, code); // Save current editor content
                } else if (file) {
                    // If not active file, ensure its content is up-to-date in FS (it should be via updateFile)
                    fileSystem.updateFile(tab.path, file.contents);
                }
                fileSystem.markFileSaved(tab.path);
            }

            const pythonExecuteFunction = pyodide.globals.get("execute_code_clean");
            if (pythonExecuteFunction) {
                await pythonExecuteFunction(code);
            } else {
                addConsoleOutput('stderr', '❌ Python execution function not found.');
            }
        } catch (error: any) {
            addConsoleOutput('stderr', `❌ IDE Error: ${error.message || error}`);
        } finally {
            setIsExecuting(false);
        }
    };

    const installPackage = async () => {
        if (!pyodide || !packageToInstall.trim() || installingPackage) return;

        setInstallingPackage(true);
        addConsoleOutput('info', `📦 Installing package: ${packageToInstall}`);

        try {
            await pyodide.runPythonAsync(`
import micropip
await micropip.install('${packageToInstall}')
            `);
            addConsoleOutput('system', `✅ Successfully installed ${packageToInstall}`);
            setPackages(prev => [...prev, packageToInstall]);
            setPackageToInstall('');
        } catch (error) {
            addConsoleOutput('stderr', `❌ Failed to install ${packageToInstall}: ${error}`);
        } finally {
            setInstallingPackage(false);
        }
    };

    // Tab management
    const openTab = (file: File) => {
        if (activeFile) {
            // Save current file's code before switching to new tab
            fileSystem.updateFile(activeFile, code);
            setOpenTabs(prev => prev.map(tab =>
                tab.path === activeFile ? { ...tab, isModified: fileSystem.getFile(activeFile)?.isModified || false } : tab
            ));
        }

        const existingTab = openTabs.find(tab => tab.path === file.path);
        if (!existingTab) {
            const newTab: TabItem = {
                path: file.path,
                filename: file.filename,
                isModified: file.isModified || false,
                type: file.type
            };
            setOpenTabs(prev => [...prev, newTab]);
        }
        setActiveFile(file.path);
    };

    // Mark active tab as modified when code changes
    useEffect(() => {
        if (activeFile) {
            const file = fileSystem.getFile(activeFile);
            if (file && file.contents !== code) { // Only mark if code actually changed
                setOpenTabs(prev => prev.map(tab =>
                    tab.path === activeFile ? { ...tab, isModified: true } : tab
                ));
            } else if (file && file.contents === code) { // If code matches saved, mark as not modified
                setOpenTabs(prev => prev.map(tab =>
                    tab.path === activeFile ? { ...tab, isModified: false } : tab
                ));
            }
        }
    }, [code, activeFile, fileSystem]); // Depend on code, activeFile, and fileSystem

    const closeTab = (path: string) => {
        const file = fileSystem.getFile(path);
        // Using a custom modal for confirmation instead of window.confirm
        const showConfirmationModal = (message: string, onConfirm: () => void) => {
            if (window.confirm(message)) { // Placeholder, replace with your custom modal
                onConfirm();
            }
        };

        if (file?.isModified) {
            showConfirmationModal(`File "${file.filename}" has unsaved changes. Close anyway?`, () => {
                setOpenTabs(prev => {
                    const newTabs = prev.filter(tab => tab.path !== path);
                    if (path === activeFile && newTabs.length > 0) {
                        setActiveFile(newTabs[0].path);
                    } else if (path === activeFile && newTabs.length === 0) {
                        setActiveFile(''); // No active file if all tabs closed
                        setCode(''); // Clear editor
                    }
                    return newTabs;
                });
            });
        } else {
            setOpenTabs(prev => {
                const newTabs = prev.filter(tab => tab.path !== path);
                if (path === activeFile && newTabs.length > 0) {
                    setActiveFile(newTabs[0].path);
                } else if (path === activeFile && newTabs.length === 0) {
                    setActiveFile('');
                    setCode('');
                }
                return newTabs;
            });
        }
    };

    // File operations
    const saveActiveFile = () => {
        if (activeFile) {
            fileSystem.updateFile(activeFile, code);
            fileSystem.markFileSaved(activeFile);
            setOpenTabs(prev => prev.map(tab =>
                tab.path === activeFile ? { ...tab, isModified: false } : tab
            ));
            addConsoleOutput('system', `💾 Saved ${activeFile}`);
        }
    };

    const addNewFile = () => {
        if (newFileName.trim() === '') {
            // Using a custom modal for alert instead of window.alert
            alert('File name cannot be empty.'); // Placeholder, replace with your custom modal
            return;
        }

        let pathToCreate = newFileName.includes('.') ? newFileName : newFileName + '.py';
        let counter = 1;
        let originalPath = pathToCreate;

        while (fileSystem.getFile(pathToCreate)) {
            const parts = originalPath.split('.');
            if (parts.length > 1) {
                pathToCreate = `${parts.slice(0, -1).join('.')}(${counter}).${parts[parts.length - 1]}`;
            } else {
                pathToCreate = `${originalPath}(${counter})`;
            }
            counter++;
        }

        const fileType = getFileType(pathToCreate);
        const newFile = fileSystem.createFile(pathToCreate, getDefaultContent(fileType), fileType);
        openTab(newFile);
        setShowFileDialog(false);
        setNewFileName('');
    };

    const getFileType = (filename: string): File['type'] => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'py': return 'python';
            case 'txt': return 'text';
            case 'json': return 'json';
            case 'md': return 'markdown';
            case 'html': return 'html';
            case 'css': return 'css';
            case 'js': return 'javascript';
            default: return 'python';
        }
    };

    const getDefaultContent = (type: File['type']): string => {
        switch (type) {
            case 'python': return '# New Python file\nprint("Hello from new file!")';
            case 'json': return '{\n  "example": "value"\n}';
            case 'markdown': return '# New Markdown File\n\nWrite your content here...';
            case 'html': return '<!DOCTYPE html>\n<html>\n<head>\n    <title>New HTML File</title>\n</head>\n<body>\n    <h1>Hello World</h1>\n</body>\n</html>';
            case 'css': return '/* New CSS File */\nbody {\n    font-family: Arial, sans-serif;\n}';
            case 'javascript': return '// New JavaScript file\nconsole.log("Hello World");';
            default: return '';
        }
    };

    const getFileIcon = (type: File['type']) => {
        switch (type) {
            case 'python': return <IconBrandPython className="text-yellow-500" />;
            case 'json': return <IconCode className="text-green-500" />;
            case 'markdown': return <IconFileText className="text-blue-500" />;
            case 'html': return <IconCode className="text-orange-500" />;
            case 'css': return <IconCode className="text-blue-600" />;
            case 'javascript': return <IconCode className="text-yellow-600" />;
            default: return <IconFile className="text-gray-500" />;
        }
    };

    const clearConsole = () => {
        setConsoleOutput([]);
        addConsoleOutput('system', '🧹 Console cleared');
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        saveActiveFile();
                        break;
                    case 'r':
                        e.preventDefault();
                        executeCode();
                        break;
                    case 'f':
                        e.preventDefault();
                        setShowSearch(!showSearch);
                        break;
                    case 'h':
                        e.preventDefault();
                        setReplaceQueryState(!showReplace);
                        break;
                }
            }

            // Handle Enter key for input
            if (isWaitingForInput && e.key === 'Enter' && e.target === inputFieldRef.current) {
                e.preventDefault();
                handleInputSubmit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSearch, showReplace, isWaitingForInput, saveActiveFile, executeCode, handleInputSubmit]);

    // Resizing handlers
    const startResizing = (e: React.MouseEvent) => {
        isResizing.current = true;
        e.preventDefault();
    };

    const startConsoleResizing = (e: React.MouseEvent) => {
        isConsoleResizing.current = true;
        e.preventDefault();
    };

    const stopResizing = () => {
        isResizing.current = false;
        isConsoleResizing.current = false;
    };

    const SidebarContent = () => {
        // useSidebar hook to control sidebar state from within its children
        const { setOpen } = useSidebar();

        switch (currentView) {
            case 'files':
                return (
                    <div className="flex flex-col h-full">
                        <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Project Files</h2>
                            <button
                                onClick={() => setShowFileDialog(true)}
                                className="p-1 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                                title="Create New File"
                            >
                                <IconPlus size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {files.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    <IconFolder size={48} className="mx-auto mb-2 opacity-50" />
                                    <p>No files yet</p>
                                    <p className="text-xs mt-1">Create a new file to get started</p>
                                </div>
                            ) : (
                                files.map((file) => (
                                    <div
                                        key={file.path}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 cursor-pointer transition-colors group",
                                            file.path === activeFile
                                                ? "bg-blue-600/20 border-r-2 border-blue-500"
                                                : "hover:bg-gray-700/50"
                                        )}
                                        onClick={() => {
                                            openTab(file);
                                            // Close mobile sidebar after selecting file
                                            setOpen(false);
                                        }}
                                    >
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            {getFileIcon(file.type)}
                                            <span className="text-sm truncate">
                                                {file.filename}
                                                {file.isModified && <span className="text-orange-400 ml-1">●</span>}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Delete "${file.filename}"?`)) { // Placeholder: Replace with custom modal
                                                    fileSystem.deleteFile(file.path);
                                                    closeTab(file.path);
                                                }
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 rounded transition-all"
                                            title="Delete File"
                                        >
                                            <IconTrash size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );

            case 'search':
                return (
                    <div className="flex flex-col h-full">
                        <div className="p-3 border-b border-gray-700">
                            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Search & Replace</h2>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Search in files..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Replace with..."
                                    value={replaceQuery}
                                    onChange={(e) => setReplaceQuery(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            {searchQuery && (
                                <div className="space-y-2">
                                    {fileSystem.searchFiles(searchQuery).map((file) => (
                                        <div
                                            key={file.path}
                                            className="p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 transition-colors"
                                            onClick={() => {
                                                openTab(file);
                                                setOpen(false); // Close mobile sidebar
                                            }}
                                        >
                                            <div className="flex items-center space-x-2">
                                                {getFileIcon(file.type)}
                                                <span className="text-sm font-medium">{file.filename}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'packages':
                return (
                    <div className="flex flex-col h-full">
                        <div className="p-3 border-b border-gray-700">
                            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Package Manager</h2>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    placeholder="Package name..."
                                    value={packageToInstall}
                                    onChange={(e) => setPackageToInstall(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                                    onKeyDown={(e) => e.key === 'Enter' && installPackage()}
                                />
                                <button
                                    onClick={installPackage}
                                    disabled={installingPackage || !packageToInstall.trim()}
                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm transition-colors"
                                >
                                    {installingPackage ? 'Installing...' : 'Install'}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-gray-300 mb-2">Pre-installed Packages</h3>
                                <div className="space-y-1">
                                    {['numpy', 'pandas', 'matplotlib', 'micropip'].map((pkg) => (
                                        <div key={pkg} className="flex items-center space-x-2 p-2 bg-gray-800 rounded">
                                            <IconPackage size={16} className="text-green-500" />
                                            <span className="text-sm">{pkg}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {packages.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Installed Packages</h3>
                                    <div className="space-y-1">
                                        {packages.map((pkg) => (
                                            <div key={pkg} className="flex items-center space-x-2 p-2 bg-gray-800 rounded">
                                                <IconPackage size={16} className="text-blue-500" />
                                                <span className="text-sm">{pkg}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="p-4 text-center text-gray-500">
                        <p>Select a view from the sidebar</p>
                    </div>
                );
        }
    };


    return (
        <SidebarProvider open={sidebarOpen} setOpen={setSidebarOpen} animate={true}>
            <div className="h-screen bg-gray-900 text-white overflow-hidden flex">
                {/* Desktop Sidebar */}
                <DesktopSidebar className="bg-gray-800 border-r border-gray-700">
                    {/* Sidebar Header - Adjusted to fit the new sidebar component structure */}
                    <div className="p-4 border-b border-gray-700">
                        <div className="flex items-center justify-between">
                            <h1 className="text-lg font-bold text-gray-200">Python IDE</h1>
                            {/* The close button is handled by MobileSidebar, DesktopSidebar animates on hover */}
                        </div>
                        <div className="flex flex-col space-y-1 mt-3"> {/* Changed to flex-col for nav links */}
                            <SidebarLink link={{ label: "Python IDE", href: "/studenthome/python", icon: <IconBrandPython size={16} className="text-blue-400" /> }} />
                            <SidebarLink link={{ label: "Dependencies", href: "/studenthome/python/dependencies", icon: <IconPackage size={16} className="text-green-400" /> }} />
                            <SidebarLink link={{ label: "Templates", href: "/studenthome/python/templates", icon: <IconCode size={16} className="text-purple-400" /> }} />
                            <SidebarLink link={{ label: "Repository", href: "/studenthome/python/repo", icon: <IconFolder size={16} className="text-yellow-400" /> }} />
                            <SidebarLink link={{ label: "Classes", href: "/studenthome/classes", icon: <IconTerminal2 size={16} className="text-red-400" /> }} />
                        </div>
                        <div className="flex space-x-1 mt-3"> {/* Sidebar Content Views */}
                            <button
                                onClick={() => setCurrentView('files')}
                                className={cn(
                                    "p-2 rounded transition-colors text-gray-300",
                                    currentView === 'files' ? "bg-blue-600 text-white" : "hover:bg-gray-700"
                                )}
                                title="Files"
                            >
                                <IconFolder size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentView('search')}
                                className={cn(
                                    "p-2 rounded transition-colors text-gray-300",
                                    currentView === 'search' ? "bg-blue-600 text-white" : "hover:bg-gray-700"
                                )}
                                title="Search"
                            >
                                <IconSearch size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentView('packages')}
                                className={cn(
                                    "p-2 rounded transition-colors text-gray-300",
                                    currentView === 'packages' ? "bg-blue-600 text-white" : "hover:bg-gray-700"
                                )}
                                title="Packages"
                            >
                                <IconPackage size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Sidebar Content (dynamic based on currentView) */}
                    <div className="flex-1 overflow-hidden">
                        <SidebarContent />
                    </div>

                    {/* Resize Handle for DesktopSidebar (keep it for manual resize, even if it's mostly hover controlled now) */}
                    <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-blue-500 transition-colors"
                        onMouseDown={startResizing}
                    />
                </DesktopSidebar>

                {/* Mobile Sidebar */}
                <MobileSidebar className="bg-gray-800 border-b border-gray-700">
                    <div className="flex flex-col space-y-1 mt-3">
                        <SidebarLink link={{ label: "Python IDE", href: "/studenthome/python", icon: <IconBrandPython size={16} className="text-blue-400" /> }} />
                        <SidebarLink link={{ label: "Dependencies", href: "/studenthome/python/dependencies", icon: <IconPackage size={16} className="text-green-400" /> }} />
                        <SidebarLink link={{ label: "Templates", href: "/studenthome/python/templates", icon: <IconCode size={16} className="text-purple-400" /> }} />
                        <SidebarLink link={{ label: "Repository", href: "/studenthome/python/repo", icon: <IconFolder size={16} className="text-yellow-400" /> }} />
                        <SidebarLink link={{ label: "Classes", href: "/studenthome/classes", icon: <IconTerminal2 size={16} className="text-red-400" /> }} />
                    </div>
                    {/* The internal sidebar content for mobile, which is usually a simplified version or just the navigation */}
                    <div className="flex space-x-1 mt-3"> {/* Sidebar Content Views */}
                        <button
                            onClick={() => setCurrentView('files')}
                            className={cn(
                                "p-2 rounded transition-colors text-gray-300",
                                currentView === 'files' ? "bg-blue-600 text-white" : "hover:bg-gray-700"
                            )}
                            title="Files"
                        >
                            <IconFolder size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentView('search')}
                            className={cn(
                                "p-2 rounded transition-colors text-gray-300",
                                currentView === 'search' ? "bg-blue-600 text-white" : "hover:bg-gray-700"
                            )}
                            title="Search"
                        >
                            <IconSearch size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentView('packages')}
                            className={cn(
                                "p-2 rounded transition-colors text-gray-300",
                                currentView === 'packages' ? "bg-blue-600 text-white" : "hover:bg-gray-700"
                            )}
                            title="Packages"
                        >
                            <IconPackage size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <SidebarContent /> {/* Can render full SidebarContent or a mobile-specific version */}
                    </div>
                </MobileSidebar>


                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Bar (Tabs and Action Buttons) */}
                    <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-grow min-w-0"> {/* flex-grow and min-w-0 for tabs */}
                            {/* Mobile menu button for sidebar */}
                            {!sidebarOpen && ( // Only show if sidebar is closed (for mobile)
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="p-2 text-gray-400 hover:bg-gray-700 rounded transition-colors md:hidden" // Only visible on mobile
                                    title="Open Sidebar"
                                >
                                    <IconMenu2 size={16} />
                                </button>
                            )}

                            {/* Tabs */}
                            <div className="flex space-x-1 overflow-x-auto pb-1 hide-scrollbar"> {/* Added hide-scrollbar for cleaner look */}
                                {openTabs.map((tab) => (
                                    <div
                                        key={tab.path}
                                        className={cn(
                                            "flex items-center space-x-2 px-3 py-1 rounded-t cursor-pointer transition-colors flex-shrink-0 text-gray-300 group", // Added group for close button visibility
                                            tab.path === activeFile
                                                ? "bg-gray-900 border-t-2 border-blue-500 text-white"
                                                : "bg-gray-700 hover:bg-gray-600"
                                        )}
                                        onClick={() => setActiveFile(tab.path)}
                                    >
                                        {getFileIcon(tab.type)}
                                        <span className="text-sm">
                                            {tab.filename}
                                            {tab.isModified && <span className="text-orange-400 ml-1">●</span>}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                closeTab(tab.path);
                                            }}
                                            className="hover:bg-gray-600 rounded p-1 transition-colors opacity-0 group-hover:opacity-100" // Hidden until hover
                                        >
                                            <IconX size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0"> {/* flex-shrink-0 for buttons */}
                            <button
                                onClick={saveActiveFile}
                                className="p-2 bg-green-600 hover:bg-green-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                                title="Save File (Ctrl+S)"
                            >
                                <IconDeviceFloppy size={16} />
                            </button>
                            <button
                                onClick={executeCode}
                                disabled={isExecuting || pyodideLoading}
                                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Run Code (Ctrl+R)"
                            >
                                <IconPlayerPlayFilled size={16} />
                            </button>
                            <button
                                onClick={clearConsole}
                                className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                title="Clear Console"
                            >
                                <IconRefresh size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-hidden">
                            {pyodideLoading ? (
                                <div className="h-full flex items-center justify-center bg-gray-900">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                        <p className="text-lg font-semibold text-gray-300">Loading Python Environment...</p>
                                        <p className="text-sm text-gray-400 mt-2">This may take a moment</p>
                                    </div>
                                </div>
                            ) : (
                                <MonacoEditor
                                    height="100%"
                                    defaultLanguage="python"
                                    value={code}
                                    onChange={(value) => {
                                        setCode(value || '');
                                        if (activeFile) {
                                            const file = fileSystem.getFile(activeFile);
                                            if (file && file.contents !== value) {
                                                setOpenTabs(prev => prev.map(tab =>
                                                    tab.path === activeFile ? { ...tab, isModified: true } : tab
                                                ));
                                            }
                                        }
                                    }}
                                    theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                                    options={{
                                        fontSize: fontSize,
                                        wordWrap: wordWrap ? 'on' : 'off',
                                        minimap: { enabled: minimap },
                                        lineNumbers: 'on',
                                        renderWhitespace: 'selection',
                                        selectOnLineNumbers: true,
                                        automaticLayout: true,
                                        scrollBeyondLastLine: false,
                                        contextmenu: true,
                                        quickSuggestions: true,
                                        suggestOnTriggerCharacters: true,
                                        acceptSuggestionOnEnter: 'smart',
                                        tabCompletion: 'on',
                                        parameterHints: { enabled: true },
                                        formatOnPaste: true,
                                        formatOnType: true,
                                        cursorStyle: 'line',
                                        fontLigatures: true,
                                        smoothScrolling: true,
                                        overviewRulerBorder: false,
                                    }}
                                    onMount={(editor) => {
                                        editorRef.current = editor;
                                    }}
                                />
                            )}
                        </div>

                        {/* Console Resize Handle */}
                        {showConsole && (
                            <div
                                className="h-1 bg-gray-700 hover:bg-blue-500 cursor-row-resize transition-colors"
                                onMouseDown={startConsoleResizing}
                            />
                        )}

                        {/* Console */}
                        {showConsole && (
                            <div
                                className="bg-gray-900 border-t border-gray-700 overflow-hidden flex flex-col"
                                style={{ height: consoleHeight }}
                            >
                                <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <IconTerminal2 size={16} className="text-green-500" />
                                        <span className="text-sm font-semibold text-gray-300">Python Console</span>
                                        {isExecuting && (
                                            <div className="flex items-center space-x-2 text-yellow-400">
                                                <div className="animate-spin rounded-full h-3 w-3 border-b border-yellow-400"></div>
                                                <span className="text-xs">Executing...</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={clearConsole}
                                            className="p-1 text-gray-400 hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            title="Clear Console"
                                        >
                                            <IconRefresh size={14} />
                                        </button>
                                        <button
                                            onClick={() => setShowConsole(false)}
                                            className="p-1 text-gray-400 hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            title="Hide Console"
                                        >
                                            <IconEyeOff size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div
                                    ref={consoleRef}
                                    className="flex-1 overflow-y-auto p-3 font-mono text-sm"
                                >
                                    {consoleOutput.map((output, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "mb-1 whitespace-pre-wrap",
                                                output.type === 'stderr' && "text-red-400",
                                                output.type === 'stdout' && "text-green-300",
                                                output.type === 'system' && "text-blue-400",
                                                output.type === 'info' && "text-cyan-400",
                                                output.type === 'warning' && "text-yellow-400",
                                                output.type === 'input' && "text-gray-300"
                                            )}
                                        >
                                            {output.content}
                                        </div>
                                    ))}

                                    {isWaitingForInput && (
                                        <div className="flex items-center space-x-2 mt-2">
                                            <span className="text-yellow-400">Input:</span>
                                            <input
                                                ref={inputFieldRef}
                                                type="text"
                                                value={currentInput}
                                                onChange={(e) => setCurrentInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
                                                className="flex-1 bg-transparent border-b border-gray-600 outline-none text-white px-1 py-0.5 focus:border-blue-500"
                                                placeholder="Enter your input..."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!showConsole && (
                            <div className="bg-gray-800 border-t border-gray-700 p-2 flex justify-center">
                                <button
                                    onClick={() => setShowConsole(true)}
                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <IconEye size={14} className="inline mr-1" />
                                    Show Console
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* File Dialog Modal */}
            <AnimatePresence>
                {showFileDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setShowFileDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-gray-800 rounded-lg p-6 w-96 max-w-md shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold mb-4 text-gray-200">Create New File</h3>
                            <input
                                type="text"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addNewFile()}
                                placeholder="Enter file name (e.g., script.py)"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                autoFocus
                            />
                            <div className="flex justify-end space-x-2 mt-4">
                                <button
                                    onClick={() => setShowFileDialog(false)}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addNewFile}
                                    disabled={!newFileName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </SidebarProvider>
    );
}

// Custom CSS for hiding scrollbar (add this to your global CSS or a <style> tag)
/*
.hide-scrollbar::-webkit-scrollbar {
    display: none;
}
.hide-scrollbar {
    -ms-overflow-style: none;  // IE and Edge
    scrollbar-width: none;  // Firefox
}
*/