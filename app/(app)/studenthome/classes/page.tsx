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
    Coffee,
    FileText,
    Code,
    Search,
    Filter,
    ArrowUpRight,
    BookOpen,
    Target,
    TrendingUp,
    User,
    LogOut,
    Loader2,
    AlertCircle
} from "lucide-react";

interface Assignment {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    status: "pending" | "submitted" | "graded";
    className: string;
    githubUrl: string;
    grade?: number;
    submissionUrl?: string;
    updatedAt: string;
}

interface GitHubUser {
    id: number;
    login: string;
    name: string;
    avatar_url: string;
    email: string;
}

export default function StudentClassesPage() {
    const { data: session, status } = useSession();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Fetch assignments from API
    const fetchAssignments = async () => {
        if (!session?.accessToken) return;

        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch('/api/assignments', {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // API endpoint doesn't exist yet - use mock data for development
                    const mockAssignments: Assignment[] = [
                        {
                            id: "1",
                            title: "JavaScript Fundamentals",
                            description: "Complete exercises on variables, functions, and loops. Focus on clean, readable code with proper error handling.",
                            dueDate: "2025-07-15",
                            status: "pending",
                            className: "Web Development 101",
                            githubUrl: "https://classroom.github.com/a/U37bz53D",
                            updatedAt: new Date().toISOString(),
                        },
                        {
                            id: "2",
                            title: "React Components Deep Dive",
                            description: "Develop a multi-component React application with state management, props handling, and API integration.",
                            dueDate: "2025-07-20",
                            status: "submitted",
                            className: "Frontend Development",
                            githubUrl: "https://github.com/classroom/assignment-2-example",
                            submissionUrl: "https://github.com/student/assignment-2-submission",
                            updatedAt: new Date().toISOString(),
                        },
                        {
                            id: "3",
                            title: "SQL & Database Design",
                            description: "Design and implement a relational database schema. Write advanced SQL queries with joins and optimization.",
                            dueDate: "2025-07-25",
                            status: "graded",
                            className: "Database Systems",
                            githubUrl: "https://github.com/classroom/assignment-3-example",
                            submissionUrl: "https://github.com/student/assignment-3-submission",
                            grade: 95,
                            updatedAt: new Date().toISOString(),
                        },
                        {
                            id: "4",
                            title: "Python Data Analysis Project",
                            description: "Perform comprehensive data analysis using Pandas, NumPy, and create visualizations with Matplotlib.",
                            dueDate: "2025-08-01",
                            status: "pending",
                            className: "Data Science Fundamentals",
                            githubUrl: "https://github.com/classroom/assignment-4-example",
                            updatedAt: new Date().toISOString(),
                        },
                        {
                            id: "5",
                            title: "Cloud Deployment & DevOps",
                            description: "Deploy a full-stack application to cloud platforms with CI/CD pipeline implementation.",
                            dueDate: "2025-08-10",
                            status: "pending",
                            className: "DevOps Introduction",
                            githubUrl: "https://github.com/classroom/assignment-5-example",
                            updatedAt: new Date().toISOString(),
                        },
                        {
                            id: "6",
                            title: "Algorithm Implementation",
                            description: "Implement and analyze common algorithms including sorting, searching, and graph traversal methods.",
                            dueDate: "2025-08-15",
                            status: "submitted",
                            className: "Data Structures & Algorithms",
                            githubUrl: "https://github.com/classroom/assignment-6-example",
                            submissionUrl: "https://github.com/student/assignment-6-submission",
                            updatedAt: new Date().toISOString(),
                        },
                    ];
                    setAssignments(mockAssignments);
                    console.warn('API endpoint not found, using mock data. Create /api/assignments endpoint for production.');
                    return;
                }
                throw new Error(`Failed to fetch assignments: ${response.statusText}`);
            }

            const data = await response.json();
            setAssignments(data.assignments || []);
        } catch (err) {
            console.error('Error fetching assignments:', err);
            setError(err instanceof Error ? err.message : 'Failed to load assignments');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated' && session?.accessToken) {
            fetchAssignments();
        } else if (status === 'unauthenticated') {
            setIsLoading(false);
        }
    }, [session, status]);

    const getStatusConfig = (status: Assignment['status']) => {
        switch (status) {
            case "pending":
                return {
                    color: "text-amber-400",
                    bg: "bg-amber-500/10",
                    border: "border-amber-500/30",
                    icon: Clock,
                    text: "Pending",
                    accent: "amber"
                };
            case "submitted":
                return {
                    color: "text-blue-400",
                    bg: "bg-blue-500/10",
                    border: "border-blue-500/30",
                    icon: CheckCircle,
                    text: "Submitted",
                    accent: "blue"
                };
            case "graded":
                return {
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10",
                    border: "border-emerald-500/30",
                    icon: Star,
                    text: "Graded",
                    accent: "emerald"
                };
            default:
                return {
                    color: "text-gray-400",
                    bg: "bg-gray-500/10",
                    border: "border-gray-500/30",
                    icon: Clock,
                    text: "Unknown",
                    accent: "gray"
                };
        }
    };

    const filteredAssignments = assignments.filter(assignment => {
        const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assignment.className.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = statusFilter === "all" || assignment.status === statusFilter;
        return matchesSearch && matchesFilter;
    });

    const getDaysUntilDue = (dueDate: string) => {
        const due = new Date(dueDate);
        const now = new Date();
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/' });
    };

    const AssignmentCard = ({ assignment }: { assignment: Assignment }) => {
        const statusConfig = getStatusConfig(assignment.status);
        const StatusIcon = statusConfig.icon;
        const daysUntilDue = getDaysUntilDue(assignment.dueDate);

        return (
            <div className="group bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bg} ${statusConfig.border} border`}>
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                        <span className={`text-sm font-medium ${statusConfig.color}`}>
                            {statusConfig.text}
                        </span>
                    </div>
                    {assignment.grade && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                            <span className="text-emerald-400 font-semibold text-sm">{assignment.grade}%</span>
                        </div>
                    )}
                </div>

                {/* Title and Class */}
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                        {assignment.title}
                    </h3>
                    <span className="inline-block bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm px-3 py-1 rounded-full">
                        {assignment.className}
                    </span>
                </div>

                {/* Description */}
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                    {assignment.description}
                </p>

                {/* Due Date */}
                <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-3 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">Due Date</span>
                        </div>
                        <div className="text-right">
                            <div className="text-white font-medium text-sm">
                                {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                            {daysUntilDue > 0 && assignment.status === 'pending' && (
                                <div className={`text-xs ${daysUntilDue <= 3 ? 'text-red-400' : daysUntilDue <= 7 ? 'text-amber-400' : 'text-slate-400'}`}>
                                    {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} left
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => window.open(assignment.githubUrl, "_blank")}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 group/btn border border-blue-500/30 hover:border-blue-400/50"
                    >
                        <Github className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                        <span>View Assignment</span>
                        <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>

                    {assignment.submissionUrl && (
                        <button
                            onClick={() => window.open(assignment.submissionUrl, "_blank")}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 border border-slate-600/50 hover:border-slate-500/50"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        );
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
                        {status === 'loading' ? 'Verifying your GitHub account...' : 'Fetching your assignments and progress...'}
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
                            <Github className="w-10 h-10 text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-4">Welcome to GitHub Classroom</h1>
                        <p className="text-slate-400 leading-relaxed">
                            Sign in with your GitHub account to access your assignments and track your academic progress.
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
                        onClick={fetchAssignments}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const user = session?.user as unknown as GitHubUser;
    const stats = {
        total: assignments.length,
        pending: assignments.filter(a => a.status === 'pending').length,
        submitted: assignments.filter(a => a.status === 'submitted').length,
        graded: assignments.filter(a => a.status === 'graded').length,
        avgGrade: assignments.filter(a => a.grade).reduce((acc, a) => acc + (a.grade || 0), 0) / assignments.filter(a => a.grade).length || 0
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Navigation */}
            <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl px-6 py-3">
                <div className="flex items-center gap-6">
                    <a href="/studenthome" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                        <Home className="w-4 h-4" />
                        <span className="text-sm font-medium">Home</span>
                    </a>
                    <a href="#" className="flex items-center gap-2 text-white">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-sm font-medium">Classes</span>
                    </a>
                    <a href="/studenthome/linux" className="flex items-center gap-2 text-slate-400 hover:text-blue-300 transition-colors">
                        <Code className="w-4 h-4" />
                        <span className="text-sm font-medium">Terminal</span>
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
                            <Target className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300 font-medium text-sm">Academic Progress</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-6">
                            My Classes & Assignments
                        </h1>

                        <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                            Track your academic journey with organized assignments, deadlines, and seamless GitHub integration.
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
                                        Welcome back, {user?.name || user?.login}
                                    </h3>
                                    <p className="text-slate-400 text-sm">Here&apos;s your academic overview</p>
                                </div>
                            </div>
                            {stats.avgGrade > 0 && (
                                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    <span className="text-emerald-400 font-semibold">{Math.round(stats.avgGrade)}% Avg</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-slate-800/30 border border-slate-600/30 rounded-xl">
                                <div className="text-blue-400 font-bold text-2xl mb-1">{stats.total}</div>
                                <div className="text-slate-400 text-sm">Total Assignments</div>
                            </div>
                            <div className="text-center p-4 bg-slate-800/30 border border-slate-600/30 rounded-xl">
                                <div className="text-amber-400 font-bold text-2xl mb-1">{stats.pending}</div>
                                <div className="text-slate-400 text-sm">Pending</div>
                            </div>
                            <div className="text-center p-4 bg-slate-800/30 border border-slate-600/30 rounded-xl">
                                <div className="text-blue-400 font-bold text-2xl mb-1">{stats.submitted}</div>
                                <div className="text-slate-400 text-sm">Submitted</div>
                            </div>
                            <div className="text-center p-4 bg-slate-800/30 border border-slate-600/30 rounded-xl">
                                <div className="text-emerald-400 font-bold text-2xl mb-1">{stats.graded}</div>
                                <div className="text-slate-400 text-sm">Graded</div>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search assignments or classes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800/80 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-slate-800/50 border border-slate-600/50 rounded-xl pl-10 pr-8 py-3 text-white focus:outline-none focus:border-blue-500/50 appearance-none min-w-[150px]"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="submitted">Submitted</option>
                                <option value="graded">Graded</option>
                            </select>
                        </div>
                    </div>

                    {/* Assignments Grid */}
                    {filteredAssignments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAssignments.map((assignment) => (
                                <AssignmentCard key={assignment.id} assignment={assignment} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-slate-900/30 border border-slate-700/50 rounded-2xl">
                            <BookOpen className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                            <h3 className="text-2xl font-semibold text-white mb-2">
                                {searchTerm || statusFilter !== "all" ? "No matching assignments" : "No assignments yet"}
                            </h3>
                            <p className="text-slate-400 max-w-md mx-auto">
                                {searchTerm || statusFilter !== "all"
                                    ? "Try adjusting your search or filter criteria"
                                    : "Your assignments will appear here once your instructors create them"
                                }
                            </p>
                            {(searchTerm || statusFilter !== "all") && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setStatusFilter("all");
                                    }}
                                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}