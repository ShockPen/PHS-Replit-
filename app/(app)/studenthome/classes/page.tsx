"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Code,
    GitBranch,
    GitCommit,
    Bell,
    BookOpen,
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    Download,
    Upload,
    Github,
    Play,
    FileText,
    Users,
    ArrowRight,
    Sparkles,
    HelpCircle,
    Bug,
    MessageCircle,
    FolderOpen
} from 'lucide-react';
import { Button, Tooltip, Link } from '@nextui-org/react'; // Assuming NextUI components are available based on template

// Re-using tabler icons for consistency if available, otherwise using lucide
import {
    IconBrandPython,
    IconTemplate,
    IconChalkboard,
    IconCode,
    IconHome,
    IconPlus,
    IconArrowRight,
    IconPackages,
    IconTerminal,
    IconDeviceLaptop,
    IconBrandGithub,
    IconWorldWww,
    IconRocket,
    IconBuildingChurch,
    IconSpider,
    IconFileChart,
    IconBrain,
    IconChartBar,
} from "@tabler/icons-react";


interface Assignment {
    id: string;
    title: string;
    language: 'cpp' | 'java' | 'python';
    status: 'submitted' | 'pending' | 'graded';
    submittedAt?: string;
    grade?: number;
    dueDate?: string;
    codePreview?: string[];
}

interface Notification {
    id: string;
    title: string;
    time: string;
    type: 'assignment' | 'grade' | 'feedback' | 'repository';
}

interface GitStatus {
    ahead: number;
    behind: number;
    modified: number;
    branch: string;
}

const GitHubClassroomDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cpp' | 'java' | 'python'>('cpp');
    const [notifications, setNotifications] = useState<Notification[]>([
        { id: '1', title: 'New assignment posted', time: '5 minutes ago', type: 'assignment' },
        { id: '2', title: 'Grade updated for Assignment 2', time: '1 hour ago', type: 'grade' },
        { id: '3', title: 'Feedback available', time: '2 hours ago', type: 'feedback' },
        { id: '4', title: 'Repository forked successfully', time: '3 hours ago', type: 'repository' }
    ]);

    const [gitStatus, setGitStatus] = useState<GitStatus>({
        ahead: 2,
        behind: 0,
        modified: 3,
        branch: 'main'
    });

    const [isGitOperationInProgress, setIsGitOperationInProgress] = useState(false);

    const assignments: Record<string, Assignment[]> = {
        cpp: [
            {
                id: '1',
                title: 'Binary Search Tree Implementation',
                language: 'cpp',
                status: 'submitted',
                submittedAt: '2 minutes ago',
                codePreview: [
                    'class BinarySearchTree {',
                    'private:',
                    '    struct Node {',
                    '        int data;',
                    '        Node* left, *right;',
                    '    };'
                ]
            },
            {
                id: '2',
                title: 'Memory Management & Pointers',
                language: 'cpp',
                status: 'graded',
                grade: 92,
                codePreview: [
                    '#include <memory>',
                    'std::unique_ptr<int> ptr = std::make_unique<int>(42);',
                    'std::cout << *ptr << std::endl;'
                ]
            },
            {
                id: '3',
                title: 'Template Metaprogramming',
                language: 'cpp',
                status: 'pending',
                dueDate: 'Due in 2 days'
            }
        ],
        java: [
            {
                id: '4',
                title: 'Spring Boot REST API',
                language: 'java',
                status: 'submitted',
                submittedAt: '1 hour ago',
                codePreview: [
                    '@RestController',
                    '@RequestMapping("/api/v1")',
                    'public class StudentController {',
                    '    @GetMapping("/students")',
                    '    public List<Student> getAllStudents() {'
                ]
            },
            {
                id: '5',
                title: 'JUnit Testing Framework',
                language: 'java',
                status: 'graded',
                grade: 88,
                codePreview: [
                    '@Test',
                    'public void testCalculateSum() {',
                    '    assertEquals(10, calculator.add(4, 6));',
                    '}'
                ]
            }
        ],
        python: [
            {
                id: '6',
                title: 'Machine Learning Pipeline',
                language: 'python',
                status: 'submitted',
                submittedAt: '30 minutes ago',
                codePreview: [
                    'import pandas as pd',
                    'from sklearn.model_selection import train_test_split',
                    'from sklearn.ensemble import RandomForestClassifier',
                    '',
                    'def train_model(data):'
                ]
            },
            {
                id: '7',
                title: 'Django Web Framework',
                language: 'python',
                status: 'pending',
                dueDate: 'Due tomorrow'
            }
        ]
    };

    const handleGitPush = async () => {
        setIsGitOperationInProgress(true);
        try {
            // Simulate git push operation
            await new Promise(resolve => setTimeout(resolve, 2000));

            setGitStatus(prev => ({ ...prev, ahead: 0 }));
            addNotification('Code pushed to remote repository', 'Just now', 'repository');
        } catch (error) {
            addNotification('Git push failed', 'Just now', 'repository');
        } finally {
            setIsGitOperationInProgress(false);
        }
    };

    const handleGitPull = async () => {
        setIsGitOperationInProgress(true);
        try {
            // Simulate git pull operation
            await new Promise(resolve => setTimeout(resolve, 1500));

            setGitStatus(prev => ({ ...prev, behind: 0 }));
            addNotification('Latest changes pulled from remote', 'Just now', 'repository');
        } catch (error) {
            addNotification('Git pull failed', 'Just now', 'repository');
        } finally {
            setIsGitOperationInProgress(false);
        }
    };

    const addNotification = (title: string, time: string, type: Notification['type']) => {
        const newNotification: Notification = {
            id: Date.now().toString(),
            title,
            time,
            type
        };

        setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    };

    const getLanguageIcon = (language: string) => {
        const iconProps = { className: "w-5 h-5" };
        switch (language) {
            case 'cpp': return <Code {...iconProps} className={`${iconProps.className} text-blue-400`} />;
            case 'java': return <FileText {...iconProps} className={`${iconProps.className} text-red-400`} />;
            case 'python': return <Play {...iconProps} className={`${iconProps.className} text-yellow-400`} />;
            default: return <Code {...iconProps} />;
        }
    };

    const getStatusBadge = (assignment: Assignment) => {
        const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold border";

        switch (assignment.status) {
            case 'submitted':
                return (
                    <span className={`${baseClasses} bg-emerald-500/20 text-emerald-400 border-emerald-500/30`}>
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Submitted
                    </span>
                );
            case 'graded':
                return (
                    <span className={`${baseClasses} bg-indigo-500/20 text-indigo-400 border-indigo-500/30`}>
                        Graded: {assignment.grade}/100
                    </span>
                );
            case 'pending':
                return (
                    <span className={`${baseClasses} bg-amber-500/20 text-amber-400 border-amber-500/30`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        In Progress
                    </span>
                );
        }
    };

    const currentAssignments = assignments[activeTab] || [];

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.8) {
                const updates = [
                    'New commit detected',
                    'Pull request review requested',
                    'Assignment deadline reminder',
                    'Repository access granted',
                    'Merge conflict resolved'
                ];
                const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
                addNotification(randomUpdate, 'Just now', 'repository');
            }
        }, 10000);

        return () => clearInterval(interval);
    }, []);

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

    const handleAIHelp = (type: string) => {
        console.log(`AI Help triggered: ${type}`);
        // You would integrate this with a backend API call to an AI service
        // Example: fetch('/api/ai-assist', { method: 'POST', body: JSON.stringify({ type, code: 'selected_code_snippet' }) });
        addNotification(`AI: ${type} functionality (simulated)`, 'Just now', 'feedback');
    };

    const RecentProjects = () => {
        const [recentProjects, setRecentProjects] = useState([
            { name: "Binary Search Tree", language: "cpp", lastEdited: "On Friday" },
            { name: "Spring Boot API", language: "java", lastEdited: "3 days ago" },
            { name: "ML Pipeline", language: "python", lastEdited: "1 day ago" },
            { name: "Memory Management", language: "cpp", lastEdited: "5 days ago" },
            { name: "JUnit Tests", language: "java", lastEdited: "2 days ago" },
            { name: "Django Web App", language: "python", lastEdited: "4 days ago" },
        ]);
        return (
            <div className="h-full p-4 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
                {recentProjects.length > 0 && (
                    <div className="mt-0 flex-1 min-h-0">
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
                                    <span className={`font-medium truncate mb-1 ${project.language === 'cpp' ? 'text-blue-600 dark:text-blue-300' : project.language === 'java' ? 'text-red-600 dark:text-red-300' : 'text-yellow-600 dark:text-yellow-300'}`}>{project.name}</span>
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{project.lastEdited}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const GitConsole = () => (
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
                    {gitStatus.ahead > 0 && <p className="text-green-400">Your branch is ahead of &apos;origin/main&apos; by {gitStatus.ahead} commits.</p>}
                    {gitStatus.behind > 0 && <p className="text-orange-400">Your branch is behind &apos;origin/main&apos; by {gitStatus.behind} commits.</p>}
                    {gitStatus.ahead === 0 && gitStatus.behind === 0 && <p className="text-neutral-400">Your branch is up to date with &apos;origin/main&apos;</p>}
                    {gitStatus.modified > 0 && <p className="text-amber-400">You have {gitStatus.modified} modified files.</p>}
                    <p className="text-blue-300 mt-2">$ git log --oneline -3</p>
                    <p className="text-neutral-400">a1b2c3d Updated assignment structure</p>
                    <p className="text-neutral-400">e4f5g6h Added new template files</p>
                    <p className="text-neutral-400">i7j8k9l Initial commit</p>
                    <p className="text-blue-300 animate-pulse mt-2">$ _</p>
                </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
                <Button
                    onClick={handleGitPush}
                    disabled={isGitOperationInProgress || gitStatus.ahead === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-400 font-semibold"
                >
                    <Upload className="w-4 h-4" />
                    <span>Push ({gitStatus.ahead})</span>
                    {isGitOperationInProgress && <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>}
                </Button>
                <Button
                    onClick={handleGitPull}
                    disabled={isGitOperationInProgress}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-400 font-semibold"
                >
                    <Download className="w-4 h-4" />
                    <span>Pull ({gitStatus.behind})</span>
                    {isGitOperationInProgress && <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>}
                </Button>
            </div>
        </div>
    );

    const ClassroomTemplates = () => (
        <div className="w-full h-full p-3 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Assignment Templates:</p>
                    <Link href="#" className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center transition-colors group-hover:text-blue-400">
                        View All <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
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
                        { name: "Basic C++ Project", icon: <Code className="h-3 w-3 text-blue-500" /> },
                        { name: "Java Spring Project", icon: <FileText className="h-3 w-3 text-red-500" /> },
                        { name: "Python ML Notebook", icon: <Play className="h-3 w-3 text-yellow-500" /> },
                        { name: "Web Dev (JS/HTML)", icon: <IconWorldWww className="h-3 w-3 text-emerald-500" /> },
                        { name: "Data Structures", icon: <IconBrain className="h-3 w-3 text-purple-500" /> },
                        { name: "Algorithm Design", icon: <IconTerminal className="h-3 w-3 text-cyan-500" /> },
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

    const HelpAndResources = () => (
        <div className="w-full h-full p-4 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300 bg-neutral-100/80 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-300">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-sm font-semibold">Help & AI Assist</h2>
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
                    className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-800/40 text-purple-600 dark:text-purple-300 rounded-md px-3 py-2 text-sm transition-all"
                    onClick={() => handleAIHelp("fix")}
                >
                    <Bug className="h-4 w-4" />
                    Fix Error
                </Button>
                <Button
                    size="sm"
                    className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-800/40 text-red-600 dark:text-red-300 rounded-md px-3 py-2 text-sm transition-all"
                    onClick={() => handleAIHelp("question")}
                >
                    <MessageCircle className="h-4 w-4" />
                    Ask a Question
                </Button>
            </div>
        </div>
    );


    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-gray-900 to-neutral-900 text-white font-sans">
            {/* Floating Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
            </div>

            {/* Header */}
            <header className="relative z-10 bg-neutral-900/50 backdrop-blur-lg border-b border-blue-500/30 sticky top-0">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Github className="w-8 h-8 text-blue-400" />
                            <div>
                                <h1 className="text-xl font-bold text-blue-400">GitHub Classroom Hub</h1>
                                <p className="text-sm text-gray-400">CS 101 - Computer Science Fundamentals</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                                <GitBranch className="w-4 h-4" />
                                <span>{gitStatus.branch}</span>
                                {gitStatus.ahead > 0 && (
                                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                                        +{gitStatus.ahead}
                                    </span>
                                )}
                                {gitStatus.behind > 0 && (
                                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                                        -{gitStatus.behind}
                                    </span>
                                )}
                            </div>
                            <Link
                                href="https://classroom.github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-blue-500/30 text-white"
                            >
                                <Github className="w-4 h-4 inline mr-2" />
                                Open Classroom
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                {/* Language Tabs */}
                <div className="flex space-x-2 mb-8 p-2 bg-neutral-900/30 backdrop-blur-lg rounded-xl border border-blue-500/20 shadow-xl">
                    {(['cpp', 'java', 'python'] as const).map((lang) => (
                        <button
                            key={lang}
                            onClick={() => setActiveTab(lang)}
                            className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                                activeTab === lang
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                            }`}
                        >
                            {getLanguageIcon(lang)}
                            <span className="capitalize">{lang === 'cpp' ? 'C++' : lang}</span>
                        </button>
                    ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Active Assignments', value: '12', icon: BookOpen, color: 'blue' },
                        { label: 'Submitted Today', value: '8', icon: Upload, color: 'emerald' },
                        { label: 'Pending Review', value: '3', icon: Clock, color: 'amber' },
                        { label: 'Completion Rate', value: '94%', icon: CheckCircle, color: 'purple' }
                    ].map((stat, index) => (
                        <div key={index} className={`bg-neutral-900/30 backdrop-blur-lg border border-${stat.color}-500/20 rounded-xl p-6 hover:border-${stat.color}-500/40 transition-all duration-300 shadow-lg`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</p>
                                    <p className="text-sm text-gray-400">{stat.label}</p>
                                </div>
                                <stat.icon className={`w-8 h-8 text-${stat.color}-500/60`} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Git Operations & Console */}
                        <div className="bg-neutral-900/30 backdrop-blur-lg border border-blue-500/20 rounded-xl p-6 shadow-xl">
                            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                                <GitBranch className="w-5 h-5 mr-2" />
                                Git Operations & Console
                            </h3>
                            <GitConsole />
                        </div>

                        {/* Assignments */}
                        <div className="bg-neutral-900/30 backdrop-blur-lg border border-blue-500/20 rounded-xl p-6 shadow-xl">
                            <h3 className="text-lg font-semibold text-blue-400 mb-6 flex items-center">
                                <Code className="w-5 h-5 mr-2" />
                                {activeTab.toUpperCase()} Assignments
                            </h3>
                            <div className="space-y-4">
                                {currentAssignments.map((assignment) => (
                                    <div
                                        key={assignment.id}
                                        className={`bg-neutral-900/40 border rounded-lg p-4 transition-all duration-300 hover:border-blue-500/40 hover:transform hover:translate-x-2 shadow-md ${
                                            assignment.language === 'cpp' ? 'border-blue-500/20 hover:shadow-blue-500/10' :
                                                assignment.language === 'java' ? 'border-red-500/20 hover:shadow-red-500/10' :
                                                    'border-yellow-500/20 hover:shadow-yellow-500/10'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-white">{assignment.title}</h4>
                                            {getStatusBadge(assignment)}
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                                            <span>
                                                {assignment.submittedAt ? `Submitted ${assignment.submittedAt}` :
                                                    assignment.dueDate || 'No due date'}
                                            </span>
                                        </div>
                                        {assignment.codePreview && (
                                            <div className="bg-black/60 border border-gray-700 rounded-lg p-3 font-mono text-sm overflow-x-auto shadow-inner">
                                                {assignment.codePreview.map((line, index) => (
                                                    <div key={index} className="flex">
                                                        <span className="text-gray-500 mr-4 select-none">{index + 1}</span>
                                                        <span className="text-gray-300">{line}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Live Notifications */}
                        <div className="bg-neutral-900/30 backdrop-blur-lg border border-blue-500/20 rounded-xl p-6 shadow-xl">
                            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                                <Bell className="w-5 h-5 mr-2" />
                                Live Notifications
                            </h3>
                            <div className="space-y-3">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className="bg-neutral-900/40 border-l-3 border-l-blue-500 rounded-r-lg p-3 transition-all duration-300 hover:bg-neutral-900/60 shadow-sm"
                                    >
                                        <p className="font-medium text-white text-sm">{notification.title}</p>
                                        <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Projects */}
                        <div className="bg-neutral-900/30 backdrop-blur-lg border border-blue-500/20 rounded-xl p-6 shadow-xl">
                            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                                <FolderOpen className="w-5 h-5 mr-2" />
                                Recent Projects
                            </h3>
                            <RecentProjects />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GitHubClassroomDashboard;