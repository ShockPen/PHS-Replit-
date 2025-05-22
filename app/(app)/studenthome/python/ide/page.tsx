"use client"
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
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
export default function Page() {
    return (
        <>
        <div className = "flex items-center flex-col space-y-2 pt-16 rounded-md bg-neutral-800 h-96 l-80 w-80">
            <button className = "mt-20 border-1 font-medium w-48 rounded-md bg-black hover:bg-stone-600 border-blue-500">
                Add File
            </button>
            <button className = "mt-20 border-1 font-medium w-48 rounded-md bg-black hover:bg-red-600 border-blue-500">
                Run Main.py
            </button>
            <button className = "mt-20 border-1 font-medium w-48 rounded-md bg-black hover:bg-blue-600 border-blue-500">
                Save Project
            </button>
        </div>
        <div className="h-96">
            <MonacoEditor
            language="python"
            theme="vs-dark"
            options={{ automaticLayout: true }}
            />
        </div>
        </>
    );
}