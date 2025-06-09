"use client";

import { Sidebar, SidebarBody, SidebarLink } from "@/app/components/ui/sidebar";
import {
    IconArrowLeft,
    IconBrandTabler,
    IconSettings,
    IconUserBolt,
    IconCoffee,
    IconPackage,
    IconTemplate,
    IconFileTypeJs,
    IconCode,
    IconTrash,
    IconFolderDown,
    IconLoader,
    IconFileDownload,
    IconUpload,
    IconPlayerPlayFilled,
    IconCloudUpload,
    IconBrandGithub,
} from "@tabler/icons-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver"; // Also install file-saver
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from "next-auth/react";
import dynamic from 'next/dynamic';
import { get } from "http";
import { useSearchParams, useRouter } from "next/navigation";
import {Code, Edit3, Play, Trash2} from "lucide-react";

// Import MonacoEditor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

declare global {
    interface Window {
        cheerpjInit: (options?: object) => Promise<void>;
        cheerpjRunMain: any;
        cheerpjAddStringFile: any;
    }
}

interface File {
    filename: string;
    contents: string;
}

interface Project {
    project_name: string,
    files: File[]
}

// In-memory storage for demonstration (replace with localStorage in real environment)
const memoryStorage = {
    getItem: (key: string) => {
        // In real environment: return localStorage.getItem(key);
        return null; // Simulated for demo
    },
    setItem: (key: string, value: string) => {
        // In real environment: localStorage.setItem(key, value);
        console.log(`Would save to localStorage: ${key}`, JSON.parse(value));
    },
    removeItem: (key: string) => {
        // In real environment: localStorage.removeItem(key);
        console.log(`Would remove from localStorage: ${key}`);
    }
};

const Editor = () => {
    const [files, setFiles] = useState<File[]>([
        {
            filename: 'Main.java',
            contents: `import java.util.Scanner;

public class Main {
    public static void main(String args[]) {
        Scanner scan = new Scanner(System.in);
        System.out.println("Enter an integer");
        int a = scan.nextInt();
        System.out.println("Your integer: " + a);
    }
}
`,
        },
        {
            filename: 'CustomFileInputStream.java',
            contents: `/*
CustomFileInputStream.java

System.in is NOT natively supported for this WASM based Java compiler. To support user input through System.in, we pause the Java runtime, pipe user input to a file in the file system, and have System.in read from the file. This file configures System.in and runs the main method of Main.java. You may configure this file to handle System.in differently. When "Run Main.java" is clicked, it runs the main method of this file (which then runs the main method of Main.java).

*/

import java.io.*;
import java.lang.reflect.*;

public class CustomFileInputStream extends InputStream {
    public CustomFileInputStream() throws IOException { 
        super();
    }

    @Override
    public int available() throws IOException {
        return 0;
    }

    @Override 
    public int read() {
        return 0;
    }

    @Override
    public int read(byte[] b, int o, int l) throws IOException {
        while (true) {
            // block until the textbox has content
            String cInpStr = getCurrentInputString();
            if (cInpStr.length() != 0) {
                // read the textbox as bytes
                byte[] data = cInpStr.getBytes();
                int len = Math.min(l - o, data.length);
                System.arraycopy(data, 0, b, o, len);
                // clears input string
                clearCurrentInputString();
                return len;
            }
            // wait before checking again
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                throw new IOException("Interrupted", e);
            }
        }
    }

    @Override
    public int read(byte[] b) throws IOException {
        return read(b, 0, b.length);
    }

    // implemented in JavaScript
    public static native String getCurrentInputString();
    public static native void clearCurrentInputString();

    // main method to invoke user's main method
    public static void main(String[] args) {
        try {
            // set the custom InputStream as the standard input
            System.setIn(new CustomFileInputStream());

            // System.out.println(args[0]);
            // Class<?> clazz = Class.forName(args[0]);
            // Method method = clazz.getMethod("main", String[].class);
            // method.invoke(null, (Object) new String[]{});

            // invoke main method in the user's main class
            // Main clazz2 = new Main();
            Main.main(new String[0]);

        // } catch (InvocationTargetException e) {
        //     e.getTargetException().printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
`,
        },
    ]);

    const [activeFile, setActiveFile] = useState('Main.java');
    const [outputLines, setOutputLines] = useState<string[]>([]);
    const [cheerpjLoaded, setCheerpjLoaded] = useState(false);
    const inputFieldRef = useRef<HTMLInputElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const [showSystemFiles, setShowSystemFiles] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const isResizing = useRef(false);
    const monacoEditorRef = useRef<any>(null);
    const [open, setOpen] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectFromUrl = searchParams.get("project") ?? "";
    const [signedIn, setSignedIn] = useState(false);
    const [name, setName] = useState('');
    const [project, setProject] = useState(projectFromUrl);
    const [projectList, setProjectList] = useState<string[]>([]);
    const { data: session } = useSession();
    const [outputHeight, setOutputHeight] = useState(200); // initial height
    const isResizingOutput = useRef(false);

    // Save management states
    const [isSavedToLocalStorage, setIsSavedToLocalStorage] = useState(true);
    const [isSavedToDatabase, setIsSavedToDatabase] = useState(true);
    const [lastLocalStorageSave, setLastLocalStorageSave] = useState<string>("");

    // GitHub functionality states
    const [createdRepos, setCreatedRepos] = useState<
        { owner: string; name: string }[]
    >([]);

    // Save to localStorage (excluding CustomFileInputStream.java)
    const saveToLocalStorage = useCallback(() => {
        const filesToSave = files.filter(f => f.filename !== 'CustomFileInputStream.java');
        const saveData = {
            project,
            files: filesToSave,
            timestamp: new Date().toISOString(),
            activeFile
        };

        const saveKey = `java_project_${project}`;
        memoryStorage.setItem(saveKey, JSON.stringify(saveData));

        setIsSavedToLocalStorage(true);
        setLastLocalStorageSave(new Date().toISOString());

        // Show success message
        setOutputLines(prev => [...prev, `✓ Project saved to local storage at ${new Date().toLocaleTimeString()}`]);
    }, [files, project, activeFile]);

    // Load from localStorage
    const loadFromLocalStorage = useCallback(() => {
        const saveKey = `java_project_${project}`;
        const savedData = memoryStorage.getItem(saveKey);

        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.files && Array.isArray(parsedData.files)) {
                    // Add CustomFileInputStream.java back to the loaded files
                    const customFileInputStream = files.find(f => f.filename === 'CustomFileInputStream.java');
                    const loadedFiles = [...parsedData.files];
                    if (customFileInputStream) {
                        loadedFiles.push(customFileInputStream);
                    }

                    setFiles(loadedFiles);
                    if (parsedData.activeFile) {
                        setActiveFile(parsedData.activeFile);
                    }
                    setLastLocalStorageSave(parsedData.timestamp || "");
                    setIsSavedToLocalStorage(true);

                    setOutputLines(prev => [...prev, `✓ Project loaded from local storage (saved: ${new Date(parsedData.timestamp).toLocaleTimeString()})`]);
                    return true;
                }
            } catch (error) {
                console.error('Error loading from localStorage:', error);
            }
        }
        return false;
    }, [project, files]);

    // Save to database (existing function, modified to update save status)
    const saveProject = async () => {
        try {
            const filteredFiles = files.filter(file => file.filename !== 'CustomFileInputStream.java');

            // Save locally in localStorage for cross-page access
            localStorage.setItem('projectFiles', JSON.stringify(filteredFiles));
            localStorage.setItem('projectData', JSON.stringify(project));

            const response = await fetch('/api/student/save_files/post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ project, files: filteredFiles })
            });

            if (response.ok) {
                const fileCount = filteredFiles.length;
                const totalLines = filteredFiles.reduce((acc, file) => acc + file.contents.split('\n').length, 0);

                setIsSavedToDatabase(true);
                setOutputLines(prev => [
                    ...prev,
                    `✓ Project saved at ${new Date().toLocaleTimeString()} | Files: ${fileCount} | Total Lines: ${totalLines}`
                ]);
            } else {
                const error = await response.json();
                throw new Error(error?.error || 'Database save failed');
            }
        } catch (errors: any) {
            console.log(errors);
            setOutputLines(prev => [
                ...prev,
                `✗ Failed to save to database: ${errors.message}`
            ]);
        }
    };

    // Handle navigation to Git page
    const handleGitNavigation = async () => {
        try {
            // First save to database
            await saveProject();

            // Then navigate to git page
            router.push('/studenthome/java/repo');
        } catch (error) {
            console.error('Error saving before navigation:', error);
            setOutputLines(prev => [...prev, `✗ Error saving before navigation: ${error}`]);
        }
    };

    // Check if project has unsaved changes
    const hasUnsavedChanges = useCallback(() => {
        return !isSavedToLocalStorage || !isSavedToDatabase;
    }, [isSavedToLocalStorage, isSavedToDatabase]);

    // Handle beforeunload event
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return 'You have unsaved changes. Are you sure you want to leave?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    // Mark as unsaved when files change
    useEffect(() => {
        // Don't mark as unsaved on initial load or when loading from storage
        if (files.length > 0 && lastLocalStorageSave) {
            setIsSavedToLocalStorage(false);
            setIsSavedToDatabase(false);
        }
    }, [files, activeFile]);

    // Auto-save to localStorage every 30 seconds if there are changes
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isSavedToLocalStorage && files.length > 0) {
                saveToLocalStorage();
                setOutputLines(prev => [...prev, `⚡ Auto-saved to local storage at ${new Date().toLocaleTimeString()}`]);
            }
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [isSavedToLocalStorage, saveToLocalStorage, files]);

    const [repoName, setRepoName] = React.useState("");

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Handle .zip file upload
        if (file.name.endsWith(".zip")) {
            try {
                const zip = await JSZip.loadAsync(file);
                const filesArray: { filename: string; contents: string }[] = [];

                // Iterate through all entries in the zip
                await Promise.all(
                    Object.keys(zip.files).map(async (filename) => {
                        const zipEntry = zip.files[filename];

                        if (!zipEntry.dir) {
                            const content = await zipEntry.async("string");
                            filesArray.push({ filename, contents: content });
                        }
                    })
                );

                // Set the files to state
                setFiles((prev) => [...prev, ...filesArray]);

                if (filesArray.length > 0) {
                    setActiveFile(filesArray[0].filename);
                }

            } catch (err) {
                console.error("Failed to read zip file:", err);
                alert("Failed to open ZIP file.");
            }

        } else {
            // Handle plain file
            const reader = new FileReader();

            reader.onload = (e) => {
                const contents = e.target?.result as string;
                const newFile = {
                    filename: file.name,
                    contents,
                };

                setFiles((prev) => [...prev, newFile]);
                setActiveFile(file.name);
            };

            reader.readAsText(file);
        }
    };

    useEffect(() => {
        if (session && session.user.role == 'student') {
            setSignedIn(true);

            const getStudentInfo = async () => {
                const response = await fetch('/api/student/get_studentinfo/post', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                setName(data.firstname + ' ' + data.lastname);
            }
            getStudentInfo();

            const getProjectFiles = async () => {
                const response = await fetch('/api/student/get_files/post', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ project_name: project })
                });

                const data = await response.json();

                if (data.project) {
                    setFiles(data.project.files);
                    setIsSavedToDatabase(true);
                } else {
                    // Try to load from localStorage if database doesn't have the project
                    if (!loadFromLocalStorage()) {
                        alert('Project not found');
                    }
                }
            }

            if (project) {
                getProjectFiles();
            }

            const getProjects = async () => {
                const response = await fetch('/api/student/get_projectlist/post', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                setProjectList(data.java_project_names);
            }
            getProjects();
        }
    }, [project, session, loadFromLocalStorage]);

    const convertToMonaco = (files: File[]) => {
        var fileData: any = []
        files.forEach(file => {
            fileData[file.filename] = file.contents;
        });
        return fileData;
    }

    // load wasm compiler
    useEffect(() => {
        const loadCheerpJ = async () => {
            try {
                const cheerpJUrl = 'https://cjrtnc.leaningtech.com/3.0/cj3loader.js';

                if (!document.querySelector(`script[src="${cheerpJUrl}"]`)) {
                    const script = document.createElement('script');
                    script.src = cheerpJUrl;
                    script.onload = async () => {
                        if (window.cheerpjInit) {
                            await window.cheerpjInit({
                                status: 'none',
                                natives: {
                                    async Java_CustomFileInputStream_getCurrentInputString() {
                                        let input = await getInput();
                                        return input;
                                    },
                                    async Java_CustomFileInputStream_clearCurrentInputString() {
                                        clearInput();
                                    },
                                },
                            });
                            setCheerpjLoaded(true);
                        }
                    };
                    document.body.appendChild(script);
                }
            } catch (error) {
                console.error('Error loading Java Compiler:', error);
            }
        };

        loadCheerpJ();
        setActiveFile('Main.java');
    }, [project, session]);

    const getInput = () => {
        return new Promise<string>((resolve) => {
            const checkKeyPress = (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if (inputFieldRef.current) {
                        inputFieldRef.current.removeEventListener('keydown', checkKeyPress);
                        inputFieldRef.current.disabled = true;
                        inputFieldRef.current.blur();
                        const value = inputFieldRef.current.value + '\n';
                        setOutputLines((prev) => [...prev, '> ' + inputFieldRef.current!.value]);
                        if (outputRef.current) {
                            outputRef.current.scrollTop = outputRef.current.scrollHeight;
                        }
                        resolve(value);
                    }
                }
            };
            if (inputFieldRef.current) {
                inputFieldRef.current.disabled = false;
                inputFieldRef.current.value = '';
                inputFieldRef.current.focus();
                inputFieldRef.current.addEventListener('keydown', checkKeyPress);
            }
        });
    };

    const clearInput = () => {
        if (inputFieldRef.current) {
            inputFieldRef.current.value = '';
        }
    };

    const generateCustomFileInputStream = (targetClassName: string) => {
        return `/*
CustomFileInputStream.java

System.in is NOT natively supported for this WASM based Java compiler. To support user input through System.in, we pause the Java runtime, pipe user input to a file in the file system, and have System.in read from the file. This file configures System.in and runs the main method of ${targetClassName}.java. You may configure this file to handle System.in differently. When "Run ${targetClassName}.java" is clicked, it runs the main method of this file (which then runs the main method of ${targetClassName}.java).

*/

import java.io.*;
import java.lang.reflect.*;

public class CustomFileInputStream extends InputStream {
    public CustomFileInputStream() throws IOException { 
        super();
    }

    @Override
    public int available() throws IOException {
        return 0;
    }

    @Override 
    public int read() {
        return 0;
    }

    @Override
    public int read(byte[] b, int o, int l) throws IOException {
        while (true) {
            // block until the textbox has content
            String cInpStr = getCurrentInputString();
            if (cInpStr.length() != 0) {
                // read the textbox as bytes
                byte[] data = cInpStr.getBytes();
                int len = Math.min(l - o, data.length);
                System.arraycopy(data, 0, b, o, len);
                // clears input string
                clearCurrentInputString();
                return len;
            }
            // wait before checking again
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                throw new IOException("Interrupted", e);
            }
        }
    }

    @Override
    public int read(byte[] b) throws IOException {
        return read(b, 0, b.length);
    }

    // implemented in JavaScript
    public static native String getCurrentInputString();
    public static native void clearCurrentInputString();

    // main method to invoke user's main method
    public static void main(String[] args) {
        try {
            // set the custom InputStream as the standard input
            System.setIn(new CustomFileInputStream());

            // invoke main method in the user's selected class
            ${targetClassName}.main(new String[0]);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}`;
    };

    const getClassNameFromFile = (filename: string) => {
        return filename.replace('.java', '');
    };

    const runCode = async () => {
        if (!cheerpjLoaded) {
            setOutputLines(['Java virtual machine is still loading! Please wait...']);
            return;
        }

        const activeClassName = getClassNameFromFile(activeFile);

        setOutputLines([`Compiling ${activeFile}...`]);

        const encoder = new TextEncoder();

        const dynamicCustomFileInputStream = generateCustomFileInputStream(activeClassName);

        const filesToCompile = [
            ...files.filter(f => f.filename !== 'CustomFileInputStream.java'),
            { filename: 'CustomFileInputStream.java', contents: dynamicCustomFileInputStream }
        ];

        filesToCompile.forEach(({ filename, contents }) => {
            const encodedContent = encoder.encode(contents);
            window.cheerpjAddStringFile('/str/' + filename, encodedContent);
        });

        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        console.log = (msg: string) => {
            setOutputLines((prev) => [...prev, msg]);
        };
        console.error = (msg: string) => {
            setOutputLines((prev) => [...prev, msg]);
        };

        try {
            const sourceFiles = filesToCompile.map(file => '/str/' + file.filename);
            const classPath = '/app/tools.jar:/files/';
            const code = await window.cheerpjRunMain(
                'com.sun.tools.javac.Main',
                classPath,
                ...sourceFiles,
                '-d',
                '/files/',
                '-Xlint'
            );

            if (code !== 0) {
                setOutputLines((prev) => [...prev, 'Compilation failed.']);
                return;
            }

            setOutputLines((prev) => [...prev, `Running ${activeFile}...`]);

            await window.cheerpjRunMain(
                'CustomFileInputStream',
                classPath,
                activeClassName
            );

        } catch (error: any) {
            console.error('Runtime error:', error);
            setOutputLines((prev) => [...prev, 'Runtime error: ' + (error?.toString() || '')]);
        } finally {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
        }
    };

    const handleEditorChange = (value: string | undefined) => {
        if (!value) return;
        setFiles(prev =>
            prev.map(file =>
                file.filename === activeFile
                    ? { ...file, contents: value }
                    : file
            )
        );
    };

    const addFile = () => {
        let baseName = 'Class';
        let extension = '.java';

        // Get the maximum suffix used so far
        let maxSuffix = 0;
        files.forEach(f => {
            const match = f.filename.match(/^Class(\d*)\.java$/);
            if (match) {
                const suffix = match[1] ? parseInt(match[1], 10) : 0;
                if (suffix >= maxSuffix) {
                    maxSuffix = suffix + 1;
                }
            }
        });
        const newFileName = `${baseName}${maxSuffix === 0 ? '' : maxSuffix}${extension}`;
        setFiles([
            ...files,
            {
                filename: newFileName,
                contents: `public class ${newFileName.replace('.java', '')} {\n\n}`,
            },
        ]);
        setActiveFile(newFileName);
    };

    const removeFile = (fileName: string) => {
        if (files.length === 1) return;
        const newFiles = files.filter(f => f.filename !== fileName);
        setFiles(newFiles);
        if (activeFile === fileName && newFiles.length > 0) {
            setActiveFile(newFiles[0].filename);
        }
    };

    const renameFile = (oldFileName: string, newFileName: string) => {
        if (files.some(f => f.filename === newFileName)) {
            alert("A file with that name already exists.");
            return;
        }
        const updatedFiles = files.map(f =>
            f.filename === oldFileName
                ? { ...f, filename: newFileName }
                : f
        );
        setFiles(updatedFiles);
        if (activeFile === oldFileName) {
            setActiveFile(newFileName);
        }
    };

    const handleExport = async () => {
        const zip = new JSZip();

        const filesToExport = files.filter(file => file.filename !== 'CustomFileInputStream.java');

        if (filesToExport.length === 1) {
            // Single file, download directly
            const file = filesToExport[0];
            const blob = new Blob([file.contents], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = file.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            // Multiple files, export as ZIP
            filesToExport.forEach(file => {
                zip.file(file.filename, file.contents);
            });

            const blob = await zip.generateAsync({ type: "blob" });
            saveAs(blob, "project-files.zip");
        }
    };

    const handleEditorDidMount = (editor: any) => {
        monacoEditorRef.current = editor;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = e.clientX - 60;
        setSidebarWidth(newWidth);
        e.preventDefault();
        if (monacoEditorRef.current) {
            monacoEditorRef.current.layout();
        }
    };

    const handleMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'auto';
    };

    const Logo = () => {
        return (
            <Link
                href="/"
                className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20"
            >
                <div className="h-6 w-6 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-lg shadow-lg shadow-blue-500/30 flex-shrink-0" />
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-semibold text-white whitespace-pre bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent"
                >
                    SchoolNest
                </motion.span>
            </Link>
        );
    };

    const LogoIcon = () => {
        return (
            <Link
                href="#"
                className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20"
            >
                <div className="h-6 w-6 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-lg shadow-lg shadow-blue-500/30 flex-shrink-0" />
            </Link>
        );
    };

    const links = [
        {
            label: "Home",
            href: "/studenthome/",
            icon: (
                <IconBrandTabler className="text-blue-400 h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Profile",
            href: "#",
            icon: (
                <IconUserBolt className="text-blue-400 h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Dashboard",
            href: "/studenthome/java",
            icon: (
                <IconCoffee className="text-blue-400 h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Dependencies",
            href: "/studenthome/java/dependencies",
            icon: (
                <IconPackage className="text-blue-400 h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Templates",
            href: "/studenthome/java/templates",
            icon: (
                <IconTemplate className="text-blue-400 h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Account Settings",
            href: "#",
            icon: (
                <IconSettings className="text-blue-400 h-5 w-5 flex-shrink-0" />
            ),
        },
        {
            label: "Logout",
            href: "",
            icon: (
                <IconArrowLeft className="text-blue-400 h-5 w-5 flex-shrink-0" />
            ),
        },
    ];

    // @ts-ignore
    return (
        <div
            className={cn(
                "rounded-md flex flex-col md:flex-row bg-black w-full flex-1 border border-slate-800 overflow-hidden",
                "h-screen"
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
                        {signedIn ?
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
                                }} />
                            :
                            null
                        }
                    </div>
                </SidebarBody>
            </Sidebar>

            <div
                className="border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 backdrop-blur-xl flex flex-col"
                style={{ width: sidebarWidth }}
            >
                <div className="p-6 -mt-2 h-full flex flex-col overflow-hidden"> {/* moved up by -mt-4 */}
                    {/* Project Header */}
                    <div className="mb-4 flex-shrink-0 font-bold flex items-center gap-2"> {/* reduce bottom margin a bit */}
                        {/* SVG and "Java IDE" */}
                        <svg
                            className="w-5 h-5"
                            viewBox="0 0 4825 2550"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path fillRule="evenodd" clipRule="evenodd" d="M2088 114L850.672 1226H2265.67L2088 114Z" fill="url(#paint0_linear_0_1)" />
                            <path d="M2300.53 1373H851L2475.94 2535L2300.53 1373Z" fill="url(#paint1_linear_0_1)" />
                            <path d="M2476 2535L2300.5 1373L1740.5 2009L2476 2535Z" fill="url(#paint2_linear_0_1)" />
                            <path d="M1232 0H456L531.5 1008L713 1155.5L1591.5 367L1232 0Z" fill="url(#paint3_linear_0_1)" />
                            <path d="M-1.65747e-05 813L331.001 28.9998L371.002 687.5L-1.65747e-05 813Z" fill="url(#paint4_linear_0_1)" />
                            <path d="M4824.5 108.5H2233L2526 1850.5L4824.5 108.5Z" fill="url(#paint5_linear_0_1)" />
                            <path d="M2639.5 2549.5L2566 2025.5L2980.5 1713L3935.5 2394L2639.5 2549.5Z" fill="url(#paint6_linear_0_1)" />
                            <defs>
                                <linearGradient id="paint0_linear_0_1" x1="1444.15" y1="192.913" x2="1444.15" y2="1152.86" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#4E60FF" />
                                    <stop offset="1" stopColor="#789FFF" />
                                </linearGradient>
                                <linearGradient id="paint1_linear_0_1" x1="1663.47" y1="1373" x2="1663.47" y2="2535" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#ADD0FF" />
                                    <stop offset="0.802885" stopColor="#DDFFF4" />
                                </linearGradient>
                                <linearGradient id="paint2_linear_0_1" x1="2112.03" y1="1376.56" x2="2112.03" y2="2533.98" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#CDFFF3" />
                                    <stop offset="1" stopColor="white" />
                                </linearGradient>
                                <linearGradient id="paint3_linear_0_1" x1="932.25" y1="82" x2="932.25" y2="1079.5" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#4E60FF" />
                                    <stop offset="1" stopColor="#789FFF" />
                                </linearGradient>
                                <linearGradient id="paint4_linear_0_1" x1="315.128" y1="26.1583" x2="168.856" y2="843.229" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#ADD0FF" />
                                    <stop offset="0.802885" stopColor="#DDFFF4" />
                                </linearGradient>
                                <linearGradient id="paint5_linear_0_1" x1="3186.25" y1="-66" x2="3186.25" y2="1850.5" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#ADD0FF" />
                                    <stop offset="0.802885" stopColor="#DDFFF4" />
                                </linearGradient>
                                <linearGradient id="paint6_linear_0_1" x1="3140.39" y1="1772.36" x2="3140.39" y2="2494.48" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#4E60FF" />
                                    <stop offset="1" stopColor="#789FFF" />
                                </linearGradient>
                            </defs>
                        </svg>
                        Java IDE
                    </div>

                    {/* Files Section */}
                    <div
                        className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-blue-300 dark:scrollbar-thumb-blue-600 hover:scrollbar-thumb-blue-400 dark:hover:scrollbar-thumb-blue-500 scrollbar-thumb-rounded-full pb-4"
                        style={{ marginTop: '-12px' }} /* pull it up more */
                    >
                        {/* Main.java - Always first */}
                        <div className="relative group">
                            <button
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 border ${
                                    activeFile === "Main.java"
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 shadow-sm"
                                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                                }`}
                                onClick={() => setActiveFile("Main.java")}
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-sm">
                                    <IconCode className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-mono text-sm font-medium truncate">Main.java</span>
                                    {activeFile === "Main.java" && (
                                        <span className="text-blue-500 dark:text-blue-400 text-xs">Entry point</span>
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Other Files */}
                        {files
                            .filter(
                                (file) =>
                                    file.filename !== "Main.java" &&
                                    file.filename !== "CustomFileInputStream.java"
                            )
                            .map((file) => (
                                <div key={file.filename} className="relative group">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            className={`flex-1 text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 border ${
                                                activeFile === file.filename
                                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 shadow-sm"
                                                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                                            }`}
                                            onClick={() => setActiveFile(file.filename)}
                                        >
                                            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-sm">
                                                <Code className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="font-mono text-sm font-medium truncate flex-1">
                    {file.filename}
                  </span>
                                        </button>

                                        {/* Action Buttons */}
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button
                                                onClick={() => {
                                                    const newFileName = prompt("Enter new file name", file.filename);
                                                    if (newFileName && newFileName !== file.filename) {
                                                        renameFile(file.filename, newFileName);
                                                    }
                                                }}
                                                className="p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-all duration-200 border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600"
                                                title="Rename file"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400" />
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
                        <div className="flex  items-center space-x-2 mb-4">
                            <Play className="h-4 w-4 text-blue-500" />
                            <h3 className="text-neutral-900 dark:text-white text-sm font-semibold">Actions</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="rounded-lg py-3 px-4 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 font-medium transition-all duration-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                onClick={addFile}
                                disabled={!cheerpjLoaded}
                            >
                                <IconFileDownload className="w-4 h-4" />
                                <span className="text-sm">Add File</span>
                            </button>

                            <button
                                className="rounded-lg py-3 px-4 bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 text-green-700 dark:text-green-300 font-medium transition-all duration-200 border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                onClick={runCode}
                                disabled={!cheerpjLoaded}
                            >
                                <IconPlayerPlayFilled className="w-4 h-4" />
                                <span className="text-sm">Run File</span>
                            </button>

                            <button
                                className="rounded-lg py-3 px-4 bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-300 font-medium transition-all duration-200 border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                onClick={handleExport}
                                disabled={!cheerpjLoaded}
                            >
                                <IconFolderDown className="w-4 h-4" />
                                <span className="text-sm">Export</span>
                            </button>

                            <button
                                className="rounded-lg py-3 px-4 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-300 font-medium transition-all duration-200 border border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                onClick={saveProject}
                                disabled={!cheerpjLoaded}
                            >
                                <IconCloudUpload className="w-4 h-4" />
                                <span className="text-sm">Save</span>
                            </button>

                            <label className="rounded-lg py-3 px-4 bg-orange-100 dark:bg-orange-800 hover:bg-orange-200 dark:hover:bg-orange-700 text-orange-700 dark:text-orange-300 font-medium cursor-pointer transition-all duration-200 border border-orange-200 dark:border-orange-700 hover:border-orange-300 dark:hover:border-orange-600 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-[0.98]">
                                <IconUpload className="w-4 h-4" />
                                <span className="text-sm">Load</span>
                                <input
                                    type="file"
                                    accept=".java"
                                    onChange={handleFileUpload}
                                    disabled={!cheerpjLoaded}
                                    className="hidden"
                                />
                            </label>

                            <button
                                className="rounded-lg py-3 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium transition-all duration-200 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                                onClick={() => window.location.href = '/studenthome/java/repo'}
                                disabled={!cheerpjLoaded}
                            >
                                <IconBrandGithub className="w-4 h-4" />
                                <span className="text-sm">Repo</span>
                            </button>
                        </div>

                        {/* Loading State */}
                        {!cheerpjLoaded && (
                            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <IconLoader className="h-4 w-4 text-blue-500 animate-spin" />
                                    <span className="text-neutral-600 dark:text-neutral-400 text-sm font-medium">Loading Java Compiler...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Resizer */}
            <div
                className="w-1 h-full bg-neutral-300 dark:bg-neutral-600 cursor-col-resize hover:bg-blue-500 dark:hover:bg-blue-500 transition-all duration-200"
                onMouseDown={handleMouseDown}
            />
            {/* monaco editor */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className='bg-[#1E1E1E]'>
                    <p
                        className='ml-2 font-mono '
                        style={{
                            fontFamily: 'monospace',
                        }}
                    >
                        {activeFile}
                    </p>
                </div>
                <div className="flex-1">
                    <MonacoEditor
                        language="java"
                        theme="vs-dark"
                        value={
                            files.find((f) => f.filename === activeFile)?.contents ?? ""
                        }
                        onChange={handleEditorChange}
                        options={{ automaticLayout: true }}
                        onMount={handleEditorDidMount}
                    />
                </div>
                {/* Output */}
                <div
                    style={{
                        height: '5px',
                        cursor: 'row-resize',
                        backgroundColor: '#ccc',
                    }}
                />

                <div
                    style={{
                        height: '200px',
                        borderTop: '1px solid #ccc',
                        backgroundColor: '#1e1e1e',
                        color: 'white',
                        fontFamily: 'monospace',
                        padding: '10px',
                        overflowY: 'auto',
                    }}
                    ref={outputRef}
                >
                    {outputLines.map((line, index) => (
                        <div key={index}>{line}</div>

                    ))}
                    {/* Input Field */}
                    <div style={{ display: 'flex' }}>
                        &gt;&nbsp;
                        <input
                            type="text"
                            ref={inputFieldRef}
                            disabled
                            style={{
                                width: '100%',
                                backgroundColor: 'transparent',
                                color: 'white',
                                border: 'none',
                                outline: 'none',
                                fontFamily: 'monospace',
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;