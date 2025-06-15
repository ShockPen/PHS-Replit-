"use client";

import React, { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
    Calendar,
    Clock,
    CheckCircle,
    Star,
    Github,
    Home,
    BookOpen,
    FileText,
    Code,
    Search,
    Filter,
    ArrowUpRight,
    Target,
    TrendingUp,
    User,
    LogOut,
    Loader2,
    AlertCircle,
    Users,
    GraduationCap,
    Plus,
    ExternalLink,
    Award,
    BarChart3,
    Settings
} from "lucide-react";

interface Class {
    id: string;
    name: string;
    description: string;
    studentCount: number;
    assignmentCount: number;
    githubClassroomUrl: string;
    createdAt: string;
    averageGrade?: number;
    activeAssignments: number;
}

interface Student {
    id: string;
    name: string;
    email: string;
    githubUsername: string;
    classId: string;
    assignmentsCompleted: number;
    totalAssignments: number;
    averageGrade?: number;
    lastActive: string;
}

interface Assignment {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    classId: string;
    submissionCount: number;
    totalStudents: number;
    status: "active" | "closed" | "draft";
    githubUrl: string;
}

interface GitHubUser {
    id: number;
    login: string;
    name: string;
    avatar_url: string;
    email: string;
}

export default function EducatorClassesPage() {
    const { data: session, status } = useSession();
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"classes" | "students" | "assignments">("classes");

    // Fetch data from API
    const fetchData = async () => {
        if (!session?.accessToken) return;

        try {
            setIsLoading(true);
            setError(null);

            // In production, these would be separate API calls
            // For now, using mock data similar to student version
            const mockClasses: Class[] = [
                {
                    id: "1",
                    name: "Web Development 101",
                    description: "Introduction to HTML, CSS, and JavaScript fundamentals with hands-on projects and real-world applications.",
                    studentCount: 28,
                    assignmentCount: 12,
                    activeAssignments: 3,
                    githubClassroomUrl: "https://classroom.github.com/classrooms/web-dev-101",
                    createdAt: new Date("2024-09-01").toISOString(),
                    averageGrade: 87.5,
                },
                {
                    id: "2",
                    name: "Frontend Development",
                    description: "Advanced React, Vue, and modern frontend frameworks with state management and performance optimization.",
                    studentCount: 22,
                    assignmentCount: 15,
                    activeAssignments: 2,
                    githubClassroomUrl: "https://classroom.github.com/classrooms/frontend-dev",
                    createdAt: new Date("2024-09-01").toISOString(),
                    averageGrade: 91.2,
                },
                {
                    id: "3",
                    name: "Full Stack Development",
                    description: "Complete web application development using Node.js, databases, and cloud deployment strategies.",
                    studentCount: 18,
                    assignmentCount: 10,
                    activeAssignments: 4,
                    githubClassroomUrl: "https://classroom.github.com/classrooms/fullstack-dev",
                    createdAt: new Date("2024-09-15").toISOString(),
                    averageGrade: 89.8,
                }
            ];

            const mockStudents: Student[] = [
                {
                    id: "1",
                    name: "Alice Johnson",
                    email: "alice.johnson@student.edu",
                    githubUsername: "alice-codes",
                    classId: "1",
                    assignmentsCompleted: 10,
                    totalAssignments: 12,
                    averageGrade: 94.5,
                    lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                },
                {
                    id: "2",
                    name: "Bob Smith",
                    email: "bob.smith@student.edu",
                    githubUsername: "bob-develops",
                    classId: "1",
                    assignmentsCompleted: 9,
                    totalAssignments: 12,
                    averageGrade: 88.2,
                    lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                },
                {
                    id: "3",
                    name: "Carol Davis",
                    email: "carol.davis@student.edu",
                    githubUsername: "carol-frontend",
                    classId: "2",
                    assignmentsCompleted: 13,
                    totalAssignments: 15,
                    averageGrade: 96.7,
                    lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                },
                {
                    id: "4",
                    name: "David Wilson",
                    email: "david.wilson@student.edu",
                    githubUsername: "david-fullstack",
                    classId: "3",
                    assignmentsCompleted: 7,
                    totalAssignments: 10,
                    averageGrade: 91.3,
                    lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                }
            ];

            const mockAssignments: Assignment[] = [
                {
                    id: "1",
                    title: "JavaScript Fundamentals Challenge",
                    description: "Master variables, functions, loops, and DOM manipulation through interactive exercises.",
                    dueDate: "2025-07-15",
                    classId: "1",
                    submissionCount: 24,
                    totalStudents: 28,
                    status: "active",
                    githubUrl: "https://classroom.github.com/a/javascript-fundamentals",
                },
                {
                    id: "2",
                    title: "React Component Architecture",
                    description: "Build scalable React applications with proper component structure and state management.",
                    dueDate: "2025-07-20",
                    classId: "2",
                    submissionCount: 18,
                    totalStudents: 22,
                    status: "active",
                    githubUrl: "https://classroom.github.com/a/react-components",
                },
                {
                    id: "3",
                    title: "API Integration Project",
                    description: "Create a full-stack application with REST API integration and database operations.",
                    dueDate: "2025-07-25",
                    classId: "3",
                    submissionCount: 12,
                    totalStudents: 18,
                    status: "active",
                    githubUrl: "https://classroom.github.com/a/api-integration",
                }
            ];

            setClasses(mockClasses);
            setStudents(mockStudents);
            setAssignments(mockAssignments);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated' && session?.accessToken) {
            fetchData();
        } else if (status === 'unauthenticated') {
            setIsLoading(false);
        }
    }, [session, status]);

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/' });
    };

    const filteredClasses = classes.filter(cls =>
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.githubUsername.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAssignments = assignments.filter(assignment =>
        assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getDaysUntilDue = (dueDate: string) => {
        const due = new Date(dueDate);
        const now = new Date();
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getLastActiveText = (lastActive: string) => {
        const now = new Date();
        const active = new Date(lastActive);
        const diffHours = Math.floor((now.getTime() - active.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return "Active now";
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    // Loading state
    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {status === 'loading' ? 'Authenticating...' : 'Loading Your Classes'}
                    </h2>
                    <p className="text-slate-400">
                        {status === 'loading' ? 'Verifying your GitHub account...' : 'Fetching your classes and student data...'}
                    </p>
                </div>
            </div>
        );
    }

    // Not authenticated - show sign in
    if (status === 'unauthenticated') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <GraduationCap className="w-10 h-10 text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-4">Educator Portal</h1>
                        <p className="text-slate-400 leading-relaxed">
                            Sign in with your GitHub account to manage your classes, assignments, and track student progress.
                        </p>
                    </div>

                    <button
                        onClick={() => signIn('github')}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl px-6 py-4 transition-all duration-200 flex items-center justify-center gap-3 border border-blue-500/30 hover:border-blue-400/50 group"
                    >
                        <Github className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        <span>Sign in with GitHub</span>
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>

                    <div className="mt-6 text-center">
                        <p className="text-slate-500 text-sm">
                            Secure authentication powered by NextAuth
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={fetchData}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const user = session?.user as unknown as GitHubUser;
    const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0);
    const totalAssignments = classes.reduce((sum, cls) => sum + cls.assignmentCount, 0);
    const activeAssignments = classes.reduce((sum, cls) => sum + cls.activeAssignments, 0);
    const avgClassGrade = classes.filter(c => c.averageGrade).reduce((sum, c) => sum + (c.averageGrade || 0), 0) / classes.filter(c => c.averageGrade).length || 0;

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Navigation */}
            <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl px-6 py-3">
                <div className="flex items-center gap-6">
                    <a href="/educatorhome" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                        <Home className="w-4 h-4" />
                        <span className="text-sm font-medium">Dashboard</span>
                    </a>
                    <a href="#" className="flex items-center gap-2 text-white">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-sm font-medium">Classes</span>
                    </a>
                    <a href="/educatorhome/analytics" className="flex items-center gap-2 text-slate-400 hover:text-blue-300 transition-colors">
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-sm font-medium">Analytics</span>
                    </a>
                    <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-600">
                        {user?.avatar_url && (
                            <img
                                src={user.avatar_url}
                                alt={user.login}
                                className="w-8 h-8 rounded-full border border-slate-600"
                            />
                        )}
                        <span className="text-slate-300 text-sm">{user?.login}</span>
                        <button
                            onClick={handleSignOut}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <div className="pt-24 pb-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2 mb-6">
                            <GraduationCap className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300 font-medium text-sm">Educator Portal</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-6">
                            My Classes & Students
                        </h1>

                        <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                            Manage your courses, track student progress, and streamline your teaching workflow with GitHub integration.
                        </p>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center">
                                    {user?.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user.login}
                                            className="w-full h-full rounded-full"
                                        />
                                    ) : (
                                        <User className="w-5 h-5 text-blue-400" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold">
                                        Welcome back, Professor {user?.name || user?.login}
                                    </h3>
                                    <p className="text-slate-400 text-sm">Here&apos;s your teaching overview</p>
                                </div>
                            </div>
                            {avgClassGrade > 0 && (
                                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    <span className="text-emerald-400 font-semibold">{Math.round(avgClassGrade)}% Class Avg</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-slate-800/30 border border-slate-600/30 rounded-xl">
                                <div className="text-blue-400 font-bold text-2xl mb-1">{classes.length}</div>
                                <div className="text-slate-400 text-sm">Active Classes</div>
                            </div>
                            <div className="text-center p-4 bg-slate-800/30 border border-slate-600/30 rounded-xl">
                                <div className="text-emerald-400 font-bold text-2xl mb-1">{totalStudents}</div>
                                <div className="text-slate-400 text-sm">Total Students</div>
                            </div>
                            <div className="text-center p-4 bg-slate-800/30 border border-slate-600/30 rounded-xl">
                                <div className="text-amber-400 font-bold text-2xl mb-1">{activeAssignments}</div>
                                <div className="text-slate-400 text-sm">Active Assignments</div>
                            </div>
                            <div className="text-center p-4 bg-slate-800/30 border border-slate-600/30 rounded-xl">
                                <div className="text-purple-400 font-bold text-2xl mb-1">{totalAssignments}</div>
                                <div className="text-slate-400 text-sm">Total Assignments</div>
                            </div>
                        </div>
                    </div>

                    {/* Search and Tabs */}
                    <div className="flex flex-col lg:flex-row gap-4 mb-8">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search classes, students, or assignments..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800/80 transition-all"
                            />
                        </div>
                        <div className="flex gap-2 bg-slate-800/30 border border-slate-600/30 rounded-xl p-1">
                            <button
                                onClick={() => setActiveTab("classes")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === "classes"
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                }`}
                            >
                                Classes ({classes.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("students")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === "students"
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                }`}
                            >
                                Students ({students.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("assignments")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === "assignments"
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                }`}
                            >
                                Assignments ({assignments.length})
                            </button>
                        </div>
                    </div>

                    {/* Content based on active tab */}
                    {activeTab === "classes" && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Your Classes</h2>
                                <button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium rounded-xl px-4 py-3 transition-all duration-200 flex items-center gap-2 border border-emerald-500/30 hover:border-emerald-400/50">
                                    <Plus className="w-4 h-4" />
                                    Create Class
                                </button>
                            </div>

                            {filteredClasses.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredClasses.map((classItem) => (
                                        <div key={classItem.id} className="group bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 backdrop-blur-sm">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center">
                                                    <BookOpen className="w-6 h-6 text-blue-400" />
                                                </div>
                                                {classItem.averageGrade && (
                                                    <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                                                        <span className="text-emerald-400 font-semibold text-sm">{Math.round(classItem.averageGrade)}%</span>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                                                {classItem.name}
                                            </h3>

                                            <p className="text-slate-300 text-sm leading-relaxed mb-6">
                                                {classItem.description}
                                            </p>

                                            <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4 mb-6">
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <div className="text-blue-400 font-bold text-lg">{classItem.studentCount}</div>
                                                        <div className="text-slate-400 text-xs">Students</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-emerald-400 font-bold text-lg">{classItem.assignmentCount}</div>
                                                        <div className="text-slate-400 text-xs">Assignments</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-amber-400 font-bold text-lg">{classItem.activeAssignments}</div>
                                                        <div className="text-slate-400 text-xs">Active</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => window.open(classItem.githubClassroomUrl, "_blank")}
                                                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 group/btn border border-blue-500/30 hover:border-blue-400/50"
                                                >
                                                    <Github className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                                                    <span>Open Classroom</span>
                                                    <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                                </button>
                                                <button className="bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 border border-slate-600/50 hover:border-slate-500/50">
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-slate-900/30 border border-slate-700/50 rounded-2xl">
                                    <BookOpen className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                                    <h3 className="text-2xl font-semibold text-white mb-2">No classes found</h3>
                                    <p className="text-slate-400 max-w-md mx-auto">
                                        {searchTerm ? "Try adjusting your search terms" : "Create your first class to get started"}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "students" && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Student Progress</h2>
                            </div>

                            {filteredStudents.length > 0 ? (
                                <div className="grid gap-4">
                                    {filteredStudents.map((student) => {
                                        const classItem = classes.find((c) => c.id === student.classId);
                                        const progressPercentage = (student.assignmentsCompleted / student.totalAssignments) * 100;

                                        return (
                                            <div key={student.id} className="bg-gradient-to-r from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-sm">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center overflow-hidden">
    <img
        src={`https://github.com/${student.githubUsername}.png`}
        alt={student.name}
        className="w-full h-full object-cover"
        onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://via.placeholder.com/48';
            target.className = 'w-full h-full object-cover';
        }}
    />
</div>
<div>
    <h3 className="text-lg font-semibold text-white">{student.name}</h3>
    <p className="text-slate-400 text-sm flex items-center gap-2">
        <span>@{student.githubUsername}</span>
        <span className="text-slate-500">•</span>
        <span>{classItem?.name || 'Unknown Class'}</span>
    </p>
</div>
</div>
<div className="flex items-center gap-4">
    {student.averageGrade && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
            <span className="text-emerald-400 font-semibold text-sm">{Math.round(student.averageGrade)}%</span>
        </div>
    )}
    <span className="text-slate-500 text-sm">{getLastActiveText(student.lastActive)}</span>
</div>
</div>

<div className="mt-6">
    <div className="flex justify-between text-sm text-slate-400 mb-2">
        <span>Progress: {student.assignmentsCompleted}/{student.totalAssignments} assignments</span>
        <span>{Math.round(progressPercentage)}% complete</span>
    </div>
    <div className="w-full bg-slate-700/50 rounded-full h-2.5">
        <div
            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full"
            style={{ width: `${progressPercentage}%` }}
        ></div>
    </div>
</div>

<div className="mt-6 flex gap-3">
    <button
        onClick={() => window.open(`https://github.com/${student.githubUsername}`, "_blank")}
        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl px-4 py-2 transition-all duration-200 flex items-center justify-center gap-2 border border-slate-600/50 hover:border-slate-500/50"
    >
        <Github className="w-4 h-4" />
        <span>GitHub Profile</span>
    </button>
    <button className="bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl px-4 py-2 transition-all duration-200 flex items-center justify-center gap-2 border border-slate-600/50 hover:border-slate-500/50">
        <FileText className="w-4 h-4" />
        <span>View Work</span>
    </button>
</div>
</div>
);
})}
</div>
) : (
    <div className="text-center py-16 bg-slate-900/30 border border-slate-700/50 rounded-2xl">
        <Users className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <h3 className="text-2xl font-semibold text-white mb-2">No students found</h3>
        <p className="text-slate-400 max-w-md mx-auto">
            {searchTerm ? "Try adjusting your search terms" : "Students will appear here once enrolled"}
        </p>
    </div>
)}
</div>
)}

{activeTab === "assignments" && (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Course Assignments</h2>
            <button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium rounded-xl px-4 py-3 transition-all duration-200 flex items-center gap-2 border border-emerald-500/30 hover:border-emerald-400/50">
                <Plus className="w-4 h-4" />
                New Assignment
            </button>
        </div>

        {filteredAssignments.length > 0 ? (
            <div className="grid gap-4">
                {filteredAssignments.map((assignment) => {
                    const classItem = classes.find((c) => c.id === assignment.classId);
                    const daysUntilDue = getDaysUntilDue(assignment.dueDate);
                    const submissionPercentage = (assignment.submissionCount / assignment.totalStudents) * 100;

                    return (
                        <div key={assignment.id} className="bg-gradient-to-r from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">{assignment.title}</h3>
                                    <p className="text-slate-300 text-sm mb-2">{classItem?.name || 'Unknown Class'}</p>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Calendar className="w-4 h-4" />
                                        <span>Due in {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}</span>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    assignment.status === 'active'
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                        : assignment.status === 'closed'
                                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                                }`}>
                                    {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                                </div>
                            </div>

                            <p className="text-slate-300 text-sm mb-6">{assignment.description}</p>

                            <div className="mb-6">
                                <div className="flex justify-between text-sm text-slate-400 mb-2">
                                    <span>Submissions: {assignment.submissionCount}/{assignment.totalStudents} students</span>
                                    <span>{Math.round(submissionPercentage)}% submitted</span>
                                </div>
                                <div className="w-full bg-slate-700/50 rounded-full h-2.5">
                                    <div
                                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-2.5 rounded-full"
                                        style={{ width: `${submissionPercentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.open(assignment.githubUrl, "_blank")}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 group/btn border border-blue-500/30 hover:border-blue-400/50"
                                >
                                    <Github className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                                    <span>View Assignment</span>
                                    <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                </button>
                                <button className="bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 border border-slate-600/50 hover:border-slate-500/50">
                                    <BarChart3 className="w-4 h-4" />
                                    <span>Analytics</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-16 bg-slate-900/30 border border-slate-700/50 rounded-2xl">
                <FileText className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                <h3 className="text-2xl font-semibold text-white mb-2">No assignments found</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                    {searchTerm ? "Try adjusting your search terms" : "Create your first assignment to get started"}
                </p>
            </div>
        )}
    </div>
)}
</div>
</div>

{/* Footer */}
<div className="pb-12 pt-8 px-4 border-t border-slate-800/50">
    <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-slate-300 font-medium">Educator Portal</span>
            </div>
            <div className="flex items-center gap-6">
                <a href="#" className="text-slate-400 hover:text-blue-300 transition-colors text-sm">Documentation</a>
                <a href="#" className="text-slate-400 hover:text-blue-300 transition-colors text-sm">Support</a>
                <a href="#" className="text-slate-400 hover:text-blue-300 transition-colors text-sm">Privacy</a>
                <a href="#" className="text-slate-400 hover:text-blue-300 transition-colors text-sm">Terms</a>
            </div>
            <div className="text-slate-500 text-sm">
                © {new Date().getFullYear()} Classroom Manager. All rights reserved.
            </div>
        </div>
    </div>
</div>
</div>
);
}