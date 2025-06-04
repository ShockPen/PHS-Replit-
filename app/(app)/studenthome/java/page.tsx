"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Link, Button, Tooltip } from "@nextui-org/react";
import { BentoGrid, BentoGridItem } from "@/app/components/ui/bento-grid";
import { BackgroundLines } from "@/app/components/ui/background-lines";
import { FloatingNav } from "@/app/components/ui/floating-navbar";
import {Sparkles, HelpCircle, Bug, MessageCircle, Upload, FolderOpen, ArrowRight} from "lucide-react";
import {
    IconCoffee,
    IconTemplate,
    IconChalkboard,
    IconCode,
    IconTableColumn,
    IconHome,
    IconPlus,
    IconArrowRight,
    IconPackages,
    IconTerminal,
    IconDeviceLaptop,
    IconBrandGithub,
    IconUpload,
    IconFolderOpen,
    IconFileCode
} from "@tabler/icons-react";

//Java Homepage

export default function Page() {
    const { data: session } = useSession();
    const [projectList, setProjectList] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);
    const [recentProjects, setRecentProjects] = useState([
        { name: "Shopping Cart App", lastEdited: "3 days ago" },
        { name: "Student Management System", lastEdited: "Yesterday" },
        { name: "Library Management System", lastEdited: "1 week ago" },
        { name: "Weather Forecast App", lastEdited: "5 days ago" },
        { name: "Task Tracker Application", lastEdited: "2 days ago" },
        { name: "Banking System Simulator", lastEdited: "4 days ago" },
    ]);

    useEffect(() => {
        if (session?.user?.role === "student") {
            const getProjects = async () => {
                try {
                    const response = await fetch("/api/student/get_projectlist/post", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    setProjectList(
                        Array.isArray(data.java_project_names) ? data.java_project_names : []
                    );
                } catch (error) {
                    console.error("Failed to fetch Java projects:", error);
                    setProjectList([]);
                }
            };
            getProjects();
        }
    }, [session]);

    const ThemeSwitcher = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded-md animate-pulse" />
        );
    }

    return (
        <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center duration-300 text-neutral-600 dark:text-neutral-300 hover:text-blue-500 dark:hover:text-blue-400 bg-neutral-100/80 dark:bg-neutral-800/60 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/60 rounded-lg transition-all hover:scale-110 border border-neutral-200/50 dark:border-neutral-700/50"
        >
            <span>
                <svg
                    viewBox="0 0 16 16"
                    className="hidden h-[22px] w-[22px] fill-current dark:block"
                >
                    <path d="M4.50663 3.2267L3.30663 2.03337L2.36663 2.97337L3.55996 4.1667L4.50663 3.2267ZM2.66663 7.00003H0.666626V8.33337H2.66663V7.00003ZM8.66663 0.366699H7.33329V2.33337H8.66663V0.366699V0.366699ZM13.6333 2.97337L12.6933 2.03337L11.5 3.2267L12.44 4.1667L13.6333 2.97337ZM11.4933 12.1067L12.6866 13.3067L13.6266 12.3667L12.4266 11.1734L11.4933 12.1067ZM13.3333 7.00003V8.33337H15.3333V7.00003H13.3333ZM7.99996 3.6667C5.79329 3.6667 3.99996 5.46003 3.99996 7.6667C3.99996 9.87337 5.79329 11.6667 7.99996 11.6667C10.2066 11.6667 12 9.87337 12 7.6667C12 5.46003 10.2066 3.6667 7.99996 3.6667ZM7.33329 14.9667H8.66663V13H7.33329V14.9667ZM2.36663 12.36L3.30663 13.3L4.49996 12.1L3.55996 11.16L2.36663 12.36Z" />
                </svg>

                <svg
                    viewBox="0 0 23 23"
                    className="h-[22px] w-[22px] fill-current dark:hidden"
                >
                    <g clipPath="url(#clip0_40_125)">
                        <path d="M16.6111 15.855C17.591 15.1394 18.3151 14.1979 18.7723 13.1623C16.4824 13.4065 14.1342 12.4631 12.6795 10.4711C11.2248 8.47905 11.0409 5.95516 11.9705 3.84818C10.8449 3.9685 9.72768 4.37162 8.74781 5.08719C5.7759 7.25747 5.12529 11.4308 7.29558 14.4028C9.46586 17.3747 13.6392 18.0253 16.6111 15.855Z" />
                    </g>
                </svg>
            </span>
        </button>
    );
};

const createProject = async () => {
        const response = await fetch('/api/student/create_java_project/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                template: "normal"
            })
        });

        const data = await response.json();

        setProjectList([...projectList, data.project_name]);

        // if (data.error) {
        //     console.log('Error creating project:', data.error);
        // } else {
        //     setProjectList([...projectList, data.project_name]);
        // }
    }



    const handleWheelEvent = useCallback(
        (e: React.WheelEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;
            const container = target.closest(".bento-scroll-container") as
                | HTMLDivElement
                | null;

            if (container) {
                const { scrollTop, scrollHeight, clientHeight } = container;
                const atTop = scrollTop === 0;
                const atBottom = scrollTop + clientHeight >= scrollHeight;

                if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                    return;
                } else {
                    e.stopPropagation();
                }
            }
        },
        []
    );

    const JavaIDEButtons = () => (
        <div className="h-full p-4 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div className="flex flex-row gap-2">
                <Link
                    href="/studenthome/java/ide"
                    className="justify-center w-1/2 border border-blue-500/50 dark:border-blue-400/50 text-blue-600 dark:text-blue-300 rounded-lg px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 text-sm font-medium group-hover:border-blue-400/70"
                >
                    <IconCoffee className="h-4 w-4 flex-shrink-0" />
                    <span>Open Java IDE</span>
                </Link>
                <Link
                    href="/studenthome/java/debugger"
                    className="justify-center w-1/2 border border-blue-500/50 dark:border-blue-400/50 text-blue-600 dark:text-blue-300 rounded-lg px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 text-sm font-medium group-hover:border-blue-400/70"
                >
                    <IconDeviceLaptop className="h-4 w-4 flex-shrink-0" />
                    <span>Java Debugger</span>
                </Link>
                <button className="justify-center w-1/2 border border-blue-500/50 dark:border-blue-400/50 text-blue-600 dark:text-blue-300 rounded-lg px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 text-sm font-medium group-hover:border-blue-400/70">
                    <IconFileCode className="h-4 w-4 flex-shrink-0" />
                    Create new project
                </button>
            </div>

            {recentProjects.length > 0 && (
                <div className="mt-3 flex-1 min-h-0">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 font-medium">Recent Projects:</p>
                    <div
                        className="bento-scroll-container space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-blue-500/30 hover:scrollbar-thumb-blue-500/50 scrollbar-thumb-rounded-full"
                        onWheel={handleWheelEvent}
                        style={{
                            maxHeight: 'calc(100% - 1.5rem)',
                            scrollBehavior: 'smooth',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(59, 130, 246, 0.3) transparent',
                            paddingBottom: '0.5rem'
                        }}
                    >
                        {recentProjects.map((project, index) => (
                            <div key={index} className="flex flex-col p-3 rounded-md bg-neutral-100/80 dark:bg-neutral-800/60 text-sm hover:bg-neutral-200/80 dark:hover:bg-neutral-700/60 transition-colors duration-200 border border-neutral-200/50 dark:border-neutral-700/50 cursor-pointer hover:scale-[1.02] group-hover:bg-neutral-150/90 dark:group-hover:bg-neutral-750/70">
                                <span className="text-blue-600 dark:text-blue-300 font-medium truncate mb-1">{project.name}</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{project.lastEdited}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const FileAccess = () => (
        <div className="w-full h-full p-4 flex flex-col overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Local Files</p>
                <button className="border border-blue-500/50 dark:border-blue-400/50 text-blue-600 dark:text-blue-300 rounded-lg px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 flex items-center gap-1 transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-blue-500/20 text-xs font-medium group-hover:border-blue-400/70 h-auto">
                    <Upload className="h-3 w-3 flex-shrink-0" />
                    <span>Upload Files</span>
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                <div
                    className="bento-scroll-container space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-blue-500/30 hover:scrollbar-thumb-blue-500/50 scrollbar-thumb-rounded-full"
                    style={{
                        maxHeight: 'calc(100% - 0.5rem)',
                        scrollBehavior: 'smooth',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(59, 130, 246, 0.3) transparent',
                        paddingBottom: '0.5rem'
                    }}
                >
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
                        <FolderOpen className="h-8 w-8 mb-2 opacity-110 mt-8" />
                        <div className="">
                            <p className="text-sm text-center font-medium">No files selected</p>
                            <p className="text-xs text-center opacity-90">Upload Java files to get started.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const DependencyManager = () => (
        <div className="w-full h-full p-4 flex flex-col overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Popular Dependencies</p>
                <Link href="/studenthome/java/dependencies" className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center transition-colors group-hover:text-blue-400">
                    View All <IconArrowRight className="h-3 w-3 ml-1" />
                </Link>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden mb-3">
                <div
                    className="bento-scroll-container h-full overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-blue-500/30 hover:scrollbar-thumb-blue-500/50 scrollbar-thumb-rounded-full"
                    onWheel={handleWheelEvent}
                    style={{
                        scrollBehavior: 'smooth',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(59, 130, 246, 0.3) transparent',
                        paddingBottom: '0.5rem'
                    }}
                >
                    {["JUnit 5", "Jackson", "Spring Boot", "Hibernate", "Apache Commons", "Mockito", "Log4j", "Gson"].map((pkg, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-md bg-neutral-100/80 dark:bg-neutral-800/60 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/60 transition-colors duration-200 border border-neutral-200/50 dark:border-neutral-700/50 group-hover:bg-neutral-150/90 dark:group-hover:bg-neutral-750/70">
                            <span className="text-blue-600 dark:text-blue-300 text-xs font-medium truncate flex-1">{pkg}</span>
                            <Tooltip content="Add dependency">
                                <Button
                                    size="sm"
                                    isIconOnly
                                    variant="flat"
                                    className="bg-blue-100/80 dark:bg-blue-900/40 hover:bg-blue-200/80 dark:hover:bg-blue-800/60 text-blue-600 dark:text-blue-400 transition-all duration-200 hover:scale-110 ml-2 flex-shrink-0 min-w-8 w-8 h-8 group-hover:bg-blue-150/90 dark:group-hover:bg-blue-850/50"
                                >
                                    <IconPlus className="h-3 w-3" />
                                </Button>
                            </Tooltip>
                        </div>
                    ))}
                </div>
            </div>

            <Button
                className="w-full border border-dashed border-blue-400/60 dark:border-blue-500/60 bg-blue-50/50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-400 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 transition-all duration-200 hover:scale-105 flex-shrink-0 group-hover:border-blue-400/80 group-hover:bg-blue-75/60"
                size="sm"
            >
                <Link href="/studenthome/java/dependencies">
                    <div className="flex items-center">
                        <IconPackages className="h-3 w-3 mr-2" />
                        <span className="font-medium text-xs">Manage Maven/Gradle</span>
                    </div>
                </Link>
            </Button>
        </div>
    );

    const JavaTemplates = () => (
        <div className="w-full h-full p-3 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Quick Start Templates:</p>
                    <a href="/studenthome/java/templates" className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center transition-colors group-hover:text-blue-400">
                        View All <ArrowRight className="h-3 w-3 ml-1" />
                    </a>
                </div>
                <div
                    className="bento-scroll-container grid grid-cols-1 gap-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-blue-500/30 hover:scrollbar-thumb-blue-500/50 scrollbar-thumb-rounded-full"
                    onWheel={handleWheelEvent}
                    style={{
                        maxHeight: 'calc(100% - 1.5rem)',
                        scrollBehavior: 'smooth',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(59, 130, 246, 0.3) transparent',
                        paddingBottom: '0.5rem'
                    }}
                >
                    {[
                        { name: "Spring MVC App", icon: <IconCode className="h-3 w-3" /> },
                        { name: "Android Project", icon: <IconCoffee className="h-3 w-3" /> },
                        { name: "REST API", icon: <IconTableColumn className="h-3 w-3" /> },
                        { name: "Console App", icon: <IconTerminal className="h-3 w-3" /> },
                        { name: "Microservice", icon: <IconCode className="h-3 w-3" /> },
                        { name: "Swing GUI App", icon: <IconTemplate className="h-3 w-3" /> }
                    ].map((template, i) => (
                        <Button
                            key={i}
                            className="justify-start bg-neutral-100/80 dark:bg-neutral-800/60 text-blue-600 dark:text-blue-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/60 transition-all duration-200 hover:scale-105 border border-neutral-200/50 dark:border-neutral-700/50 h-7 group-hover:bg-neutral-150/90 dark:group-hover:bg-neutral-750/70"
                            size="sm"
                        >
                            {template.icon}
                            <span className="ml-2 text-xs font-medium truncate">{template.name}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );

    const JavaClasses = () => (
        <div className="w-full h-full p-3 overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div className="rounded-lg border border-blue-400/50 dark:border-blue-500/50 p-3 bg-blue-50/50 dark:bg-blue-900/20 h-full flex flex-col backdrop-blur-sm overflow-hidden group-hover:border-blue-400/70 group-hover:bg-blue-75/60">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-300 mb-2 flex-shrink-0">Current Courses</h3>
                <div
                    className="bento-scroll-container flex-1 min-h-0 overflow-y-auto space-y-1.5 mb-2 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-blue-500/30 hover:scrollbar-thumb-blue-500/50 scrollbar-thumb-rounded-full"
                    onWheel={handleWheelEvent}
                    style={{
                        scrollBehavior: 'smooth',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(59, 130, 246, 0.3) transparent',
                        paddingBottom: '0.5rem'
                    }}
                >
                    {["Java Fundamentals", "Advanced OOP", "Data Structures", "Design Patterns", "Spring Framework"].map((course, i) => (
                        <div key={i} className="flex items-center justify-between p-1.5 rounded-md bg-white/80 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors duration-200 group-hover:bg-neutral-25 dark:group-hover:bg-neutral-750/50">
                            <span className="text-blue-600 dark:text-blue-300 text-xs font-medium truncate flex-1">{course}</span>
                            <Button
                                as={Link}
                                href={`/studenthome/classes/${i}`}
                                size="sm"
                                className="bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg ml-2 flex-shrink-0 h-5 min-w-10 text-xs group-hover:bg-blue-550"
                            >
                                Open
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-blue-300/30 dark:border-blue-600/30 flex-shrink-0">
                    <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">7 pending assignments</p>
                    <Link
                        href="/studenthome/java/assignments"
                        className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors group-hover:text-blue-400"
                    >
                        View all
                    </Link>
                </div>
            </div>
        </div>
    );

    const CodeRepository = () => (
        <div className="w-full h-full p-3 flex flex-col overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div
                className="bento-scroll-container bg-neutral-900 rounded-lg p-2 font-mono text-blue-400 text-xs flex-1 mb-2 border border-neutral-700/50 shadow-lg overflow-y-auto scrollbar-thin scrollbar-track-neutral-800 scrollbar-thumb-blue-500/30 hover:scrollbar-thumb-blue-500/50 scrollbar-thumb-rounded-full group-hover:border-neutral-600/70 group-hover:bg-neutral-850"
                onWheel={handleWheelEvent}
                style={{
                    scrollBehavior: 'smooth',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(59, 130, 246, 0.3) rgba(38, 38, 38, 1)',
                    paddingBottom: '0.5rem'
                }}
            >
                <div className="space-y-1">
                    <p className="text-blue-300">$ git status</p>
                    <p className="text-green-400">On branch main</p>
                    <p className="text-neutral-400">Your branch is up to date with &apos;origin/main&apos;</p>
                    <p className="text-blue-300 mt-2">$ javac -version</p>
                    <p className="text-yellow-400">javac 17.0.2</p>
                    <p className="text-blue-300 mt-2">$ git log --oneline -5</p>
                    <p className="text-blue-300 animate-pulse mt-2">$ _</p>
                </div>
            </div>
            <Button
                as={Link}
                href="/studenthome/java/repo"
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-blue-400 hover:text-blue-300 transition-all duration-200 hover:scale-105 border border-neutral-600/50 flex-shrink-0 group-hover:bg-neutral-750 group-hover:border-neutral-500/70"
                size="sm"
            >
                <IconBrandGithub className="h-3 w-3 mr-2" />
                <span className="font-medium text-xs">Repository Explorer</span>
            </Button>
        </div>
    );

    const LinuxTerminal      = () => (
        <div className="h-full p-4 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div
                className="bento-scroll-container bg-neutral-900 rounded-lg p-2 font-mono text-blue-400 text-xs flex-1 mb-2 border border-neutral-700/50 shadow-lg overflow-y-auto scrollbar-thin scrollbar-track-neutral-800 scrollbar-thumb-blue-500/30 hover:scrollbar-thumb-blue-500/50 scrollbar-thumb-rounded-full group-hover:border-neutral-600/70 group-hover:bg-neutral-850"
                onWheel={handleWheelEvent}
                style={{
                    scrollBehavior: 'smooth',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(59, 130, 246, 0.3) rgba(38, 38, 38, 1)',
                    paddingBottom: '0.5rem'
                }}
            >
                <div className="space-y-1">
                    <p className="text-blue-300">$ cd ~/Projects</p>
                    <p className="text-blue-300">~/Projects$ ls</p>
                    <p className="text-neutral-300">Main.java  FizzBuzz.java</p>
                    <p className="text-blue-300">~/Projects$ ssh SchoolNest</p>
                    <p className="text-blue-300">tharun@172.20.10.11 password:<span className="animate-pulse mt-2 opacity-100"> ____</span></p>
                    <p className="text-blue-300">tharun@172.20.10.11~: $  <span className="animate-pulse mt-2 opacity-100">|</span></p>
                </div>
            </div>
            <Button
                as={Link}
                href="/studenthome/java/repo"
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-blue-400 hover:text-blue-300 transition-all duration-200 hover:scale-105 border border-neutral-600/50 flex-shrink-0 group-hover:bg-neutral-750 group-hover:border-neutral-500/70"
                size="sm"
            >
                <IconTerminal className="h-3 w-3 mr-2" />
                <span className="font-medium text-xs">Open Terminal</span>
            </Button>
        </div>
    );

    const AIHelpBento = () => (
        <div className="w-full h-full p-4 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300 bg-neutral-100/80 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-300">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-sm font-semibold">AI Assistant</h2>
            </div>

            <div className="flex flex-col gap-2 flex-1 justify-center">
                <Button
                    size="sm"
                    className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-300 rounded-md px-3 py-2 text-sm transition-all"
                    onClick={() => handleAIHelp("explain")}
                >
                    <HelpCircle className="h-4 w-4" />
                    Explain Code
                </Button>
                <Button
                    size="sm"
                    className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-800/40 text-yellow-600 dark:text-yellow-300 rounded-md px-3 py-2 text-sm transition-all"
                    onClick={() => handleAIHelp("fix")}
                >
                    <Bug className="h-4 w-4" />
                    Fix Error
                </Button>
                <Button
                    size="sm"
                    className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-800/40 text-green-600 dark:text-green-300 rounded-md px-3 py-2 text-sm transition-all"
                    onClick={() => handleAIHelp("question")}
                >
                    <MessageCircle className="h-4 w-4" />
                    Ask a Question
                </Button>
            </div>
        </div>
    );


    const items = [
        {
            title: "Java Environment",
            description: "Access your Java coding environments and recent projects.",
            header: <JavaIDEButtons />,
            className: "md:col-span-2 md:row-span-1",
            icon: <IconCoffee className="h-4 w-4 text-blue-400" />,
        },
        {
            title: "File Access",
            description: "Upload, manage, and open local Java files.",
            header: <FileAccess />,
            className: "md:col-span-1 md:row-span-1",
            icon: <IconFolderOpen className="h-4 w-4 text-blue-400" />,
        },
        {
            title: "Dependencies",
            description: "Manage Java libraries and frameworks with ease.",
            header: <DependencyManager />,
            className: "md:col-span-1 md:row-span-1",
            icon: <IconPackages className="h-4 w-4 text-blue-400" />,
        },
        {
            title: "Project Templates",
            description: "Start projects quickly with pre-built templates.",
            header: <JavaTemplates />,
            className: "md:col-span-1",
            icon: <IconTemplate className="h-4 w-4 text-blue-400" />,
        },
        {
            title: "Classes & Assignments",
            description: "Java courses, assignments, and learning materials.",
            header: <JavaClasses />,
            className: "md:col-span-1",
            icon: <IconChalkboard className="h-4 w-4 text-blue-400" />,
        },
        {
            title: "Code Repository",
            description: "Version control and project repositories.",
            header: <CodeRepository />,
            className: "md:col-span-1",
            icon: <IconBrandGithub className="h-4 w-4 text-blue-400" />,
        },
        {
            title: "Linux Terminal",
            description: "Use linux commands on your files.",
            header: <LinuxTerminal />,
            className: "md:col-span-1",
            icon: <IconTerminal className="h-4 w-4 text-blue-400" />,
        },
        {
            title: "AI Features",
            description: "Coming soon...",
            header: <AIHelpBento />,
            className: "md:col-span-1",
            icon: <Sparkles className="h-4 w-4 text-blue-400" />,
        },
    ];

    const handleAIHelp = (type: string) => {
        console.log(`AI Help triggered: ${type}`);
    };

    const dockLinks = [
        {
            title: "Back Home",
            icon: <IconHome className="h-full w-full text-blue-400" />,
            href: "/studenthome",
        },
        {
            title: "Java IDE",
            icon: <IconCoffee className="h-full w-full text-blue-400" />,
            href: "/studenthome/java/ide",
        },
        {
            title: "Debugger",
            icon: <IconDeviceLaptop className="h-full w-full text-blue-400" />,
            href: "/studenthome/java/debugger",
        },
        {
            title: "Repository",
            icon: <IconBrandGithub className="h-full w-full text-blue-400" />,
            href: "/studenthome/java/repo",
        },
        {
            title: "Classes",
            icon: <IconChalkboard className="h-full w-full text-blue-400" />,
            href: "/studenthome/classes",
        },
    ];

    return (
        <>
            <FloatingNav className="z-50" />

            <div className="pt-32 px-4 min-h-screen bg-neutral-950 text-white">
                <div className="max-w-7xl mx-auto">
                    <div className="relative mb-12">
                        <BackgroundLines className="opacity-10 absolute inset-0">
                            <div className="absolute inset-0" />
                        </BackgroundLines>

                        <div className="text-center relative z-10">
                            <h1 className="text-4xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-blue-200 via-blue-300 to-blue-500 font-bold mb-4">
                                Java Dashboard
                            </h1>
                            <p className="text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
                                Your comprehensive Java development environment and learning hub
                            </p>

                            <div className="flex justify-center mb-12">
                                <div className="flex space-x-4 p-4 bg-neutral-900/80 backdrop-blur-xl rounded-2xl border border-neutral-700/40 shadow-2xl">
                                    {dockLinks.map((link, index) => (
                                        <div key={index} className="relative group">
                                            <Link
                                                href={link.href}
                                                className="flex items-center justify-center w-14 h-14 bg-neutral-800/70 backdrop-blur-sm hover:bg-neutral-700/90 rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-2 border border-neutral-600/50 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
                                            >
                                                {React.cloneElement(link.icon, {
                                                    className: "h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-200"
                                                })}
                                            </Link>

                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900/95 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 pointer-events-none border border-neutral-600/50 shadow-xl">
                                                {link.title}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900/95"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <BentoGrid className="mx-auto md:auto-rows-[20rem] gap-4 pb-20">
                        {items.map((item, i) => (
                            <BentoGridItem
                                key={i}
                                title={item.title}
                                description={item.description}
                                header={item.header}
                                className={`${item.className} group hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden`}
                                icon={item.icon}
                            />
                        ))}
                    </BentoGrid>
                </div>
            </div>

            <style jsx global>{`
                .bento-grid-item {
                    overflow: hidden !important;
                    border-radius: 1rem !important;
                    contain: layout style paint;
                }

                .bento-grid-item > div {
                    height: 100% !important;
                    overflow: hidden !important;
                    box-sizing: border-box;
                }

                .bento-scroll-container {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
                    scroll-behavior: smooth;
                }

                .bento-scroll-container::-webkit-scrollbar {
                    width: 4px;
                }

                .bento-scroll-container::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 2px;
                }

                .bento-scroll-container::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.3);
                    border-radius: 2px;
                    transition: background-color 0.2s ease;
                }

                .bento-scroll-container::-webkit-scrollbar-thumb:hover {
                    background: rgba(59, 130, 246, 0.5);
                }

                .bento-scroll-container {
                    overscroll-behavior: contain;
                }

                html {
                    scroll-behavior: smooth;
                }

                ::-webkit-scrollbar {
                    width: 6px;
                }

                ::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                }

                ::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.5);
                    border-radius: 3px;
                    transition: background-color 0.2s ease;
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(59, 130, 246, 0.7);
                }

                .truncate {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .scrollbar-thin {
                    scrollbar-width: thin;
                }

                .scrollbar-track-transparent {
                    scrollbar-color: transparent transparent;
                }

                .scrollbar-thumb-blue-500 {
                    scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
                }

                .scrollbar-thumb-rounded-full {
                }
            `}</style>
        </>
    );
}