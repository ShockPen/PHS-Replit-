'use client';
import { loadPyodide } from 'pyodide';
import React, { MouseEventHandler, useEffect, useRef, useState } from 'react';
import {
    IconCoffee,
    IconBrandTypescript,
    IconFileTypeJs,
    IconBrandPython,
    IconBrandCpp,
    IconTerminal2,
} from "@tabler/icons-react";
import {
    IconClipboardCopy,
    IconFileBroken,
    IconSignature,
    IconTableColumn,
} from "@tabler/icons-react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import { useSession } from "next-auth/react";
import Script from 'next/script';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface File {
  filename: string;
  contents: string;
}

interface Project {
  project_name: string,
  files: File[]
}

export default function Page() {
    const [code, setCode] = useState('');
    const [pyodide, setPyodide] = useState<any>(null);
    const [result, setResult] = useState('');
    const [userInput, setUserInput] = useState('');
    const [activeFile, setActiveFile] = useState('Main.java');


    useEffect(() => {
        const loadPyodideRuntime = async () => {
            const pyodideInstance = await (window as any).loadPyodide();
            await pyodideInstance.loadPackage("numpy");
            setPyodide(pyodideInstance);
        };
        if ((window as any).loadPyodide) {
            loadPyodideRuntime();
        }
    }, []);

    const runPython = async () => {
        if (!pyodide) {
            console.log("Pyodide is not loaded yet.");
            setResult("Pyodide is not loaded yet.")
            return;
        }
        const wrappedCode = `
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = sys.stdout

${code}

sys.stdout.getvalue()
`;

        setResult(pyodide.runPython(wrappedCode));
        console.log(result);
    };

    return (
  <div className="flex h-screen"> 
    <Script src="https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js" strategy="beforeInteractive" />
    <div className="flex flex-col items-center space-y-2 pt-16 bg-neutral-800 w-80 h-screen"> 
        <button className =  "mb-20 font-8xl h-12 w-20 rounded-md bg-neutral-700">
            Main.py
        </button>
        <button className="mb-20 border font-medium w-48 rounded-md bg-black hover:bg-stone-600 border-blue-500">
        System files
      </button>
      <button className="border font-medium w-48 rounded-md bg-black hover:bg-stone-600 border-blue-500">
        Add File
      </button>
      <button
        onClick={runPython}
        id="runCode"
        className="mt-20 border font-medium w-48 rounded-md bg-black hover:bg-red-600 border-blue-500"
      >
        Run Main.py
      </button>
      <button className="mt-20 border font-medium w-48 rounded-md bg-black hover:bg-blue-600 border-blue-500">
        Save Project
      </button>
    </div>
    <div id="ed" className="flex-1 flex-col h-screen">
      <MonacoEditor
        height="60%"
        language="python"
        theme="vs-dark"
        value={code}
        onChange={(value) => setCode(value || '')}
        options={{ automaticLayout: true }}
      />
      <div className="bg-black text-green-400 p-4 font-mono h-40 overflow-y-auto border-t border-gray-700">
        <strong>Console Output:</strong>
        <pre className="whitespace-pre-wrap">{'>'} {result}</pre>
      </div>
    </div>
  </div>
);
}
