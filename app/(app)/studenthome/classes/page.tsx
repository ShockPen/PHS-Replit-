"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
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
    FolderOpen,
    PlusCircle,
    UserPlus,
    Book,
    ExternalLink,
    Globe,
    Terminal,
    Brain,
    BarChart,
    User as UserIcon // Renamed to avoid conflict with 'User' interface if defined
} from 'lucide-react';

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

interface UserRepo {
    name: string;
    language: string; // e.g., 'C++', 'Java', 'Python'
    lastActivity: string;
    url: string;
    // Add other relevant repo details from GitHub API if needed
}

interface UserProfile {
    username: string;
    avatarUrl: string;
    isTeacher: boolean; // This would typically come from your backend/database based on GitHub Classroom roles
    accessToken?: string; // Stored client-side for immediate use, but backend should validate
}

// Initial dummy data for assignments (will be overwritten by dynamic data if logged in)
const initialAssignments: Record<string, Assignment[]> = {
    cpp: [],
    java: [],
    python: []
};

// Initial dummy data for git status (will be updated dynamically)
const initialGitStatus: Record<string, GitStatus> = {
    cpp: { ahead: 0, behind: 0, modified: 0, branch: 'main' },
    java: { ahead: 0, behind: 0, modified: 0, branch: 'main' },
    python: { ahead: 0, behind: 0, modified: 0, branch: 'main' },
};

// Common Tailwind CSS classes for consistent styling
const cardClasses = "bg-neutral-900/30 backdrop-blur-lg border border-blue-500/20 rounded-xl p-6 shadow-xl transition-all duration-300 hover:border-blue-500/40";
const headingClasses = "text-lg font-semibold text-blue-400 mb-4 flex items-center";
const scrollContainerBaseClasses = "bento-scroll-container overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-blue-500/30 hover:scrollbar-thumb-blue-500/50 scrollbar-thumb-rounded-full";
const scrollContainerStyle = {
    scrollBehavior: 'smooth' as 'smooth',
    scrollbarWidth: 'thin' as 'thin',
    scrollbarColor: 'rgba(59, 130, 246, 0.3) transparent'
};

const GitHubClassroomDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cpp' | 'java' | 'python'>('cpp');
    const [notifications, setNotifications] = useState<Notification[]>([]); // Start with empty notifications
    const [gitStatus, setGitStatus] = useState<Record<string, GitStatus>>(initialGitStatus);
    const [isGitOperationInProgress, setIsGitOperationInProgress] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userRepositories, setUserRepositories] = useState<UserRepo[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [assignments, setAssignments] = useState<Record<string, Assignment[]>>(initialAssignments);

    // Backend API Base URL (replace with your actual backend URL)
    const BACKEND_API_BASE_URL = "https://your-backend-api.com"; // e.g., "https://my-github-classroom-backend.vercel.app"
    const NETLIFY_FRONTEND_URL = "https://phsreplit.netlify.app";

    // Define addNotification first as it's a dependency for others
    const addNotification = useCallback((title: string, time: string, type: Notification['type']) => {
        const newNotification: Notification = {
            id: Date.now().toString(),
            title,
            time,
            type
        };
        setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications
    }, []);

    // Function to fetch user profile and repositories from your backend
    const fetchUserProfileAndRepos = useCallback(async (token: string) => {
        setIsLoading(true);
        try {
            // Fetch user profile and repos from your backend
            const response = await fetch(`${BACKEND_API_BASE_URL}/api/github/user-data`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    addNotification('Session expired. Please log in again.', 'Just now', 'feedback');
                    handleLogout(); // Log out if unauthorized
                }
                throw new Error(`Failed to fetch user data: ${response.statusText}`);
            }

            const data = await response.json();
            // Assuming your backend returns data like:
            // { username: "ekans-0", avatarUrl: "...", isTeacher: true/false, repositories: [...] }
            setUserProfile({
                username: data.username,
                avatarUrl: data.avatarUrl,
                isTeacher: data.isTeacher,
                accessToken: token // Store token for subsequent API calls
            });

            const fetchedRepos: UserRepo[] = data.repositories.map((repo: any) => ({
                name: repo.full_name, // e.g., "ekans-0/cs101-cpp-assignment-1"
                language: repo.language || 'N/A', // GitHub API provides language
                lastActivity: new Date(repo.updated_at).toLocaleString(), // Format date
                url: repo.html_url
            }));
            setUserRepositories(fetchedRepos);
            addNotification('User data and repositories fetched successfully!', 'Just now', 'repository');

            // Simulate fetching assignments based on fetched repos
            const dynamicAssignments: Record<string, Assignment[]> = {
                cpp: fetchedRepos.filter(r => r.language === 'C++').map(r => ({
                    id: r.name, title: `Assignment for ${r.name.split('/')[1]}`, language: 'cpp', status: 'pending', dueDate: 'Due soon', codePreview: ['// Your C++ code here']
                })),
                java: fetchedRepos.filter(r => r.language === 'Java').map(r => ({
                    id: r.name, title: `Assignment for ${r.name.split('/')[1]}`, language: 'java', status: 'submitted', submittedAt: 'Yesterday', codePreview: ['// Your Java code here']
                })),
                python: fetchedRepos.filter(r => r.language === 'Python').map(r => ({
                    id: r.name, title: `Assignment for ${r.name.split('/')[1]}`, language: 'python', status: 'graded', grade: 95, codePreview: ['# Your Python code here']
                })),
            };
            setAssignments(dynamicAssignments);
            addNotification('Assignments updated based on user repos!', 'Just now', 'assignment');

            // Simulate initial git status for fetched repos
            const dynamicGitStatus: Record<string, GitStatus> = { ...initialGitStatus };
            fetchedRepos.forEach(repo => {
                const langKey = repo.language.toLowerCase() as 'cpp' | 'java' | 'python';
                if (dynamicGitStatus[langKey]) {
                    // This is a simplified simulation. In reality, you'd fetch actual branch status.
                    dynamicGitStatus[langKey].ahead = Math.floor(Math.random() * 3);
                    dynamicGitStatus[langKey].behind = Math.floor(Math.random() * 2);
                    dynamicGitStatus[langKey].modified = Math.floor(Math.random() * 4);
                    dynamicGitStatus[langKey].branch = 'main'; // Assuming 'main' branch
                }
            });
            setGitStatus(dynamicGitStatus);
            addNotification('Git status updated for your repositories!', 'Just now', 'repository');


        } catch (error) {
            console.error("Error fetching user data:", error);
            addNotification(`Failed to load user data: ${error instanceof Error ? error.message : String(error)}`, 'Just now', 'feedback');
            setUserProfile(null); // Clear profile on error
            setUserRepositories([]);
            setAssignments(initialAssignments);
            setGitStatus(initialGitStatus);
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);


    const handleGitPush = useCallback(async () => {
        if (!userProfile?.accessToken) {
            addNotification('Not logged in. Please sign in to push code.', 'Just now', 'feedback');
            return;
        }

        setIsGitOperationInProgress(true);
        try {
            // In a real application, this would be a POST request to your backend's /api/git/push endpoint
            // Your backend would then use the GitHub API to perform the actual push.
            const response = await fetch(`${BACKEND_API_BASE_URL}/api/git/push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userProfile.accessToken}`
                },
                body: JSON.stringify({
                    repoName: userRepositories.find(repo => repo.language.toLowerCase() === activeTab)?.name, // Find relevant repo
                    language: activeTab,
                    // You might send file content, commit message, etc. here
                })
            });

            if (!response.ok) {
                throw new Error(`Git push failed: ${response.statusText}`);
            }

            const result = await response.json();
            // Assuming backend returns updated status or confirmation
            setGitStatus(prev => ({
                ...prev,
                [activeTab]: { ...prev[activeTab], ahead: 0, modified: 0 } // Reset ahead/modified after successful push
            }));
            addNotification(`Code pushed for ${activeTab.toUpperCase()} repository successfully!`, 'Just now', 'repository');
        } catch (error) {
            console.error("Git push error:", error);
            addNotification(`Git push failed for ${activeTab.toUpperCase()}: ${error instanceof Error ? error.message : String(error)}`, 'Just now', 'repository');
        } finally {
            setIsGitOperationInProgress(false);
        }
    }, [activeTab, userProfile, userRepositories, addNotification]);

    const handleGitPull = useCallback(async () => {
        if (!userProfile?.accessToken) {
            addNotification('Not logged in. Please sign in to pull code.', 'Just now', 'feedback');
            return;
        }

        setIsGitOperationInProgress(true);
        try {
            // In a real application, this would be a POST request to your backend's /api/git/pull endpoint
            // Your backend would then use the GitHub API to perform the actual pull.
            const response = await fetch(`${BACKEND_API_BASE_URL}/api/git/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userProfile.accessToken}`
                },
                body: JSON.stringify({
                    repoName: userRepositories.find(repo => repo.language.toLowerCase() === activeTab)?.name, // Find relevant repo
                    language: activeTab,
                })
            });

            if (!response.ok) {
                throw new Error(`Git pull failed: ${response.statusText}`);
            }

            const result = await response.json();
            // Assuming backend returns updated status or confirmation
            setGitStatus(prev => ({
                ...prev,
                [activeTab]: { ...prev[activeTab], behind: 0 } // Reset behind after successful pull
            }));
            addNotification(`Latest changes pulled for ${activeTab.toUpperCase()} repository!`, 'Just now', 'repository');
        } catch (error) {
            console.error("Git pull error:", error);
            addNotification(`Git pull failed for ${activeTab.toUpperCase()}: ${error instanceof Error ? error.message : String(error)}`, 'Just now', 'repository');
        } finally {
            setIsGitOperationInProgress(false);
        }
    }, [activeTab, userProfile, userRepositories, addNotification]);

    const handleLogout = useCallback(() => {
        setUserProfile(null);
        setUserRepositories([]);
        setAssignments(initialAssignments); // Reset assignments to initial dummy state
        setGitStatus(initialGitStatus); // Reset git status
        localStorage.removeItem('userProfile'); // Clear persisted login
        localStorage.removeItem('githubAccessToken'); // Clear the access token
        addNotification('Logged out successfully', 'Just now', 'repository');
    }, [addNotification]);

    // Initial load effect: Check for access token in URL or localStorage
    useEffect(() => {
        setIsLoading(true);
        const urlParams = new URLSearchParams(window.location.search);
        const accessTokenFromUrl = urlParams.get('accessToken');

        if (accessTokenFromUrl) {
            // If token is in URL, store it and remove from URL for security
            localStorage.setItem('githubAccessToken', accessTokenFromUrl);
            window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
            fetchUserProfileAndRepos(accessTokenFromUrl);
        } else {
            // Try to load from localStorage
            const storedAccessToken = localStorage.getItem('githubAccessToken');
            const storedUserProfile = localStorage.getItem('userProfile');
            if (storedAccessToken && storedUserProfile) {
                const parsedProfile = JSON.parse(storedUserProfile);
                setUserProfile({ ...parsedProfile, accessToken: storedAccessToken });
                fetchUserProfileAndRepos(storedAccessToken);
            } else {
                setIsLoading(false); // No token, no auto-login
            }
        }
    }, [fetchUserProfileAndRepos]); // Dependency on fetchUserProfileAndRepos

    // Simulate real-time updates for notifications (still simulated as real-time API is complex)
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.8 && userProfile) { // Only add notifications if a user is logged in
                const updates = [
                    'New commit detected in a linked repository!',
                    'Pull request review requested for your assignment!',
                    'Assignment deadline reminder!',
                    'Repository access granted for a new project!',
                    'Merge conflict resolved in your branch!'
                ];
                const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
                addNotification(randomUpdate, 'Just now', 'repository');
            }
        }, 10000); // Every 10 seconds
        return () => clearInterval(interval);
    }, [addNotification, userProfile]);


    const getLanguageIcon = useCallback((language: string) => {
        const iconProps = { className: "w-5 h-5" };
        switch (language) {
            case 'cpp': return <Code {...iconProps} className={`${iconProps.className} text-blue-400`} />;
            case 'java': return <FileText {...iconProps} className={`${iconProps.className} text-red-400`} />;
            case 'python': return <Play {...iconProps} className={`${iconProps.className} text-yellow-400`} />;
            default: return <Code {...iconProps} />;
        }
    }, []);

    const getStatusBadge = useCallback((assignment: Assignment) => {
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

    const handleAIHelp = useCallback((type: string) => {
        console.log(`AI Help triggered: ${type}`);
        addNotification(`AI: ${type} functionality (simulated)`, 'Just now', 'feedback');
    }, [addNotification]);

    const simulateFetchUserRepos = useCallback(async (username: string) => {
        // --- REAL WORLD SCENARIO: ---
        // This is where you'd make a fetch call to your backend:
        // const response = await fetch(`/api/github/user-repos?username=${username}`, {
        //     headers: { Authorization: `Bearer ${userAccessToken}` } // Pass your session/access token
        // });
        // const data = await response.json();
        // setUserRepositories(data);
        // --- END REAL WORLD SCENARIO ---

        // For this simulation, we'll generate dummy data based on the user's GitHub name
        const simulatedRepos: UserRepo[] = [
            { name: `${username}/cs101-cpp-assignment-1`, language: "cpp", lastActivity: "5 minutes ago", url: `https://github.com/${username}/cs101-cpp-assignment-1` },
            { name: `${username}/cs101-java-rest-api`, language: "java", lastActivity: "1 hour ago", url: `https://github.com/${username}/cs101-java-rest-api` },
            { name: `${username}/cs101-python-ml-project`, language: "python", lastActivity: "3 hours ago", url: `https://github.com/${username}/cs101-python-ml-project` },
            { name: `${username}/my-personal-project`, language: "python", lastActivity: "Yesterday", url: `https://github.com/${username}/my-personal-project` },
            { name: `${username}/another-cpp-repo`, language: "cpp", lastActivity: "2 days ago", url: `https://github.com/${username}/another-cpp-repo` },
        ];
        setUserRepositories(simulatedRepos);
        addNotification(`Repositories for ${username} fetched (simulated)`, 'Just now', 'repository');

        // Simulate fetching assignments relevant to these repos
        // In a real app, this would fetch assignments from your backend DB linked to these repos
        const dynamicAssignments: Record<string, Assignment[]> = {
            cpp: simulatedRepos.filter(r => r.language === 'cpp').map(r => ({
                id: r.name, title: `Assignment for ${r.name.split('/')[1]}`, language: 'cpp', status: 'pending', dueDate: 'Due soon', codePreview: ['// Your C++ code here']
            })),
            java: simulatedRepos.filter(r => r.language === 'java').map(r => ({
                id: r.name, title: `Assignment for ${r.name.split('/')[1]}`, language: 'java', status: 'submitted', submittedAt: 'Yesterday', codePreview: ['// Your Java code here']
            })),
            python: simulatedRepos.filter(r => r.language === 'python').map(r => ({
                id: r.name, title: `Assignment for ${r.name.split('/')[1]}`, language: 'python', status: 'graded', grade: 95, codePreview: ['# Your Python code here']
            })),
        };
        setAssignments(dynamicAssignments);
        addNotification('Assignments updated based on user repos (simulated)', 'Just now', 'assignment');

    }, [addNotification]);


    const handleGitHubLogin = useCallback(async (isTeacher: boolean) => {
        // IMPORTANT: In a real application, you would NOT expose your Client ID directly here.
        // The OAuth flow would start by redirecting to your backend, which then handles
        // the secure part of the OAuth exchange.
        const clientId = "YOUR_GITHUB_CLIENT_ID"; // Replace with your actual GitHub OAuth App Client ID

        // Your GitHub username can be part of the organization name for classroom setup
        const organizationName = "ekans-0-classroom"; // Example: using your GitHub username as part of the org name

        // The base URL for your Netlify site
        const baseUrl = "https://phsreplit.netlify.app";

        // The Authorization callback URL you registered on GitHub for your OAuth App.
        // This should match the "Authorization callback URL" you set in GitHub OAuth App settings.
        // In a real application, this would typically point to a backend endpoint that handles
        // the OAuth token exchange and then redirects back to the frontend with a session token.
        const authCallbackUrl = `${baseUrl}/auth/github/callback`; // This would be your backend's endpoint

        const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&redirect_uri=${authCallbackUrl}`;

        // Simulate OAuth initiation by opening a new tab to the GitHub authorization URL
        window.open(githubOAuthUrl, '_blank');

        // --- REAL WORLD SCENARIO: ---
        // After GitHub redirects back to your `authCallbackUrl`, your backend would:
        // 1. Receive the authorization code.
        // 2. Exchange the code for an access token using your Client Secret (securely on the backend).
        // 3. Fetch user details (username, avatar, etc.) from GitHub API using the access token.
        // 4. Store the access token and user info in your session/database.
        // 5. Create a session for the user and send a session token/cookie to the frontend.
        // 6. Redirect the user back to the dashboard (e.g., `https://phsreplit.netlify.app/dashboard?sessionToken=XYZ`).
        // --- END REAL WORLD SCENARIO ---

        // For this simulation, we'll directly set a dummy user profile and fetch repos
        setTimeout(async () => {
            const simulatedUsername = "ekans-0"; // This would come from GitHub API in a real app
            const simulatedUserProfile: UserProfile = {
                username: simulatedUsername,
                avatarUrl: `https://github.com/${simulatedUsername}.png`, // Placeholder avatar
                isTeacher: isTeacher // Set based on the button clicked
            };
            setUserProfile(simulatedUserProfile);
            localStorage.setItem('userProfile', JSON.stringify(simulatedUserProfile)); // Persist simulated login

            addNotification(`Logged in as ${simulatedUsername} (simulated)`, 'Just now', 'repository');

            // Now fetch repositories and assignments for this simulated user
            await simulateFetchUserRepos(simulatedUsername);

            let redirectUrl;
            if (isTeacher) {
                redirectUrl = `https://classroom.github.com/organizations/${organizationName}/classrooms`;
            } else {
                const studentRepoBaseName = "cs101-assignments";
                redirectUrl = `https://github.com/${organizationName}/${studentRepoBaseName}-${activeTab}`;
            }
            // window.open(redirectUrl, '_blank'); // In a real app, this would be the final redirect after backend processing

        }, 1000);
    }, [activeTab, addNotification, simulateFetchUserRepos]);

    // Custom Button component to replace native button and ensure memoization
    const CustomButton: React.FC<{
        onClick: () => void;
        disabled?: boolean;
        className?: string;
        children: React.ReactNode;
        ariaLabel?: string;
    }> = memo(({ onClick, disabled, className, children, ariaLabel }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
            aria-label={ariaLabel}
        >
            {children}
        </button>
    ));
    CustomButton.displayName = 'CustomButton';

    // Custom Link component to replace native anchor and ensure memoization
    const CustomLink: React.FC<{
        href: string;
        className?: string;
        children: React.ReactNode;
        target?: string;
        rel?: string;
        ariaLabel?: string;
    }> = memo(({ href, className, children, target, rel, ariaLabel }) => (
        <a
            href={href}
            className={`inline-flex items-center ${className}`}
            target={target}
            rel={rel}
            aria-label={ariaLabel}
        >
            {children}
        </a>
    ));
    CustomLink.displayName = 'CustomLink';

    // Memoized components for performance optimization
    const MemoizedRecentProjects = memo(() => {
        // These projects would ideally also come from your backend, linked to the user's activity
        const [recentProjects, setRecentProjects] = useState([
            { name: "Binary Search Tree", language: "cpp", lastEdited: "On Friday" },
            { name: "Spring Boot API", language: "java", lastEdited: "3 days ago" },
            { name: "ML Pipeline", language: "python", lastEdited: "1 day ago" },
        ]);
        return (
            <div className="h-full p-4 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
                {recentProjects.length > 0 && (
                    <div className="mt-0 flex-1 min-h-0">
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 font-medium">Recent Projects:</p>
                        <div
                            className={`${scrollContainerBaseClasses} space-y-2`}
                            onWheel={handleWheelEvent}
                            style={{ ...scrollContainerStyle, maxHeight: 'calc(100% - 1.5rem)', paddingBottom: '0.5rem' }}
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
    });
    MemoizedRecentProjects.displayName = 'MemoizedRecentProjects';

    const MemoizedGitConsole = memo(({ currentGitStatus, isGitOperationInProgress, handleGitPush, handleGitPull, activeTab }: {
        currentGitStatus: GitStatus;
        isGitOperationInProgress: boolean;
        handleGitPush: () => Promise<void>;
        handleGitPull: () => Promise<void>;
        activeTab: 'cpp' | 'java' | 'python';
    }) => (
        <div className="w-full h-full p-3 flex flex-col overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div
                className={`${scrollContainerBaseClasses} bg-neutral-900 rounded-lg p-2 font-mono text-blue-400 text-xs flex-1 mb-2 border border-neutral-700/50 shadow-lg group-hover:border-neutral-600/70 group-hover:bg-neutral-850`}
                style={{ ...scrollContainerStyle, scrollbarColor: 'rgba(59, 130, 246, 0.3) rgba(38, 38, 38, 1)', paddingBottom: '0.5rem' }}
            >
                <div className="space-y-1">
                    <p className="text-blue-300">$ git status ({activeTab.toUpperCase()} Repo)</p>
                    {currentGitStatus.ahead > 0 && <p className="text-green-400">Your branch is ahead of &apos;origin/main&apos; by {currentGitStatus.ahead} commits.</p>}
                    {currentGitStatus.behind > 0 && <p className="text-orange-400">Your branch is behind &apos;origin/main&apos; by {currentGitStatus.behind} commits.</p>}
                    {currentGitStatus.ahead === 0 && currentGitStatus.behind === 0 && <p className="text-neutral-400">Your branch is up to date with &apos;origin/main&apos;</p>}
                    {currentGitStatus.modified > 0 && <p className="text-amber-400">You have {currentGitStatus.modified} modified files.</p>}
                    <p className="text-blue-300 mt-2">$ git log --oneline -3</p>
                    <p className="text-neutral-400">a1b2c3d Latest commit from backend</p>
                    <p className="text-neutral-400">e4f5g6h Previous commit</p>
                    <p className="text-blue-300 animate-pulse mt-2">$ _</p>
                </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
                <CustomButton
                    onClick={handleGitPush}
                    disabled={isGitOperationInProgress || currentGitStatus.ahead === 0}
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400"
                    ariaLabel={`Push code for ${activeTab.toUpperCase()} repository`}
                >
                    <Upload className="w-4 h-4" />
                    <span>Push ({currentGitStatus.ahead})</span>
                    {isGitOperationInProgress && <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>}
                </CustomButton>
                <CustomButton
                    onClick={handleGitPull}
                    disabled={isGitOperationInProgress}
                    className="bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-400"
                    ariaLabel={`Pull code for ${activeTab.toUpperCase()} repository`}
                >
                    <Download className="w-4 h-4" />
                    <span>Pull ({currentGitStatus.behind})</span>
                    {isGitOperationInProgress && <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>}
                </CustomButton>
            </div>
        </div>
    ));
    MemoizedGitConsole.displayName = 'MemoizedGitConsole';

    const MemoizedClassroomTemplates = memo(({ handleWheelEvent }: { handleWheelEvent: (e: React.WheelEvent<HTMLDivElement>) => void }) => (
        <div className="w-full h-full p-3 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300">
            <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Assignment Templates:</p>
                    <CustomLink href="#" className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center transition-colors group-hover:text-blue-400" ariaLabel="View all assignment templates">
                        View All <ArrowRight className="h-3 w-3 ml-1" />
                    </CustomLink>
                </div>
                <div
                    className={`${scrollContainerBaseClasses} grid grid-cols-1 gap-1.5`}
                    onWheel={handleWheelEvent}
                    style={{ ...scrollContainerStyle, maxHeight: 'calc(100% - 1.5rem)', paddingBottom: '0.5rem' }}
                >
                    {[
                        { name: "Basic C++ Project", icon: <Code className="h-3 w-3 text-blue-500" /> },
                        { name: "Java Spring Project", icon: <FileText className="h-3 w-3 text-red-500" /> },
                        { name: "Python ML Notebook", icon: <Play className="h-3 w-3 text-yellow-500" /> },
                        { name: "Web Dev (JS/HTML)", icon: <Globe className="h-3 w-3 text-emerald-500" /> },
                        { name: "Data Structures", icon: <Brain className="h-3 w-3 text-purple-500" /> },
                        { name: "Algorithm Design", icon: <Terminal className="h-3 w-3 text-cyan-500" /> },
                    ].map((template, i) => (
                        <CustomButton
                            key={i}
                            onClick={() => { /* Handle template selection */ }}
                            className="justify-start bg-neutral-100/80 dark:bg-neutral-800/60 text-blue-600 dark:text-blue-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/60 transition-all duration-200 hover:scale-105 border border-neutral-200/50 dark:border-neutral-700/50 h-7 group-hover:bg-neutral-150/90 dark:group-hover:bg-neutral-750/70"
                            ariaLabel={`Select ${template.name} template`}
                        >
                            {template.icon}
                            <span className="ml-2 text-xs font-medium truncate">{template.name}</span>
                        </CustomButton>
                    ))}
                </div>
            </div>
        </div>
    ));
    MemoizedClassroomTemplates.displayName = 'MemoizedClassroomTemplates';

    const MemoizedHelpAndResources = memo(({ handleAIHelp }: { handleAIHelp: (type: string) => void }) => (
        <div className={`${cardClasses} flex flex-col justify-between overflow-hidden group-hover:scale-[1.02]`}>
            <div className="flex items-center gap-2 mb-4 text-blue-400">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-lg font-semibold">AI Assist & Help</h2>
            </div>

            <div className="flex flex-col gap-2 flex-1 justify-center">
                <CustomButton
                    onClick={() => handleAIHelp("explain")}
                    className="bg-blue-500/20 dark:bg-blue-900/20 hover:bg-blue-500/30 dark:hover:bg-blue-800/40 text-blue-400 shadow-md hover:shadow-blue-500/10"
                    ariaLabel="Get AI help to explain code"
                >
                    <HelpCircle className="h-4 w-4" />
                    Explain Code
                </CustomButton>
                <CustomButton
                    onClick={() => handleAIHelp("fix")}
                    className="bg-purple-500/20 dark:bg-purple-900/20 hover:bg-purple-500/30 dark:hover:bg-purple-800/40 text-purple-400 shadow-md hover:shadow-purple-500/10"
                    ariaLabel="Get AI help to fix errors"
                >
                    <Bug className="h-4 w-4" />
                    Fix Error
                </CustomButton>
                <CustomButton
                    onClick={() => handleAIHelp("question")}
                    className="bg-red-500/20 dark:bg-red-900/20 hover:bg-red-500/30 dark:hover:bg-red-800/40 text-red-400 shadow-md hover:shadow-red-500/10"
                    ariaLabel="Ask AI a question"
                >
                    <MessageCircle className="h-4 w-4" />
                    Ask a Question
                </CustomButton>
            </div>
        </div>
    ));
    MemoizedHelpAndResources.displayName = 'MemoizedHelpAndResources';

    const MemoizedMyRepositories = memo(({ handleWheelEvent, userRepositories }: { handleWheelEvent: (e: React.WheelEvent<HTMLDivElement>) => void, userRepositories: UserRepo[] }) => {
        return (
            <div className={`${cardClasses} flex flex-col overflow-hidden group-hover:scale-[1.02]`}>
                <h3 className={headingClasses}>
                    <FolderOpen className="w-5 h-5 mr-2" />
                    My Class Repositories
                </h3>
                <div
                    className={`${scrollContainerBaseClasses} space-y-3`}
                    onWheel={handleWheelEvent}
                    style={{ ...scrollContainerStyle, maxHeight: 'calc(100% - 3rem)', paddingBottom: '0.5rem' }}
                >
                    {userRepositories.length > 0 ? (
                        userRepositories.map((repo, index) => (
                            <div key={index} className="flex flex-col p-3 rounded-md bg-neutral-900/40 text-sm hover:bg-neutral-900/60 transition-colors duration-200 border border-neutral-700/50 cursor-pointer shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`font-medium truncate ${repo.language === 'C++' ? 'text-blue-400' : repo.language === 'Java' ? 'text-red-400' : repo.language === 'Python' ? 'text-yellow-400' : 'text-neutral-400'}`}>{repo.name}</span>
                                    <CustomLink href={repo.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 transition-colors" ariaLabel={`Go to ${repo.name} repository on GitHub`}>
                                        <ExternalLink className="h-4 w-4" />
                                    </CustomLink>
                                </div>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">Last Activity: {repo.lastActivity}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 py-4">Sign in with GitHub to see your repositories.</div>
                    )}
                </div>
            </div>
        );
    });
    MemoizedMyRepositories.displayName = 'MemoizedMyRepositories';

    const MemoizedTeacherActions = memo(({ addNotification, isTeacher }: { addNotification: (title: string, time: string, type: Notification['type']) => void, isTeacher: boolean }) => {
        if (!isTeacher) return null; // Only render if the user is a teacher
        return (
            <div className={`${cardClasses} flex flex-col overflow-hidden group-hover:scale-[1.02]`}>
                <h3 className={headingClasses}>
                    <Book className="w-5 h-5 mr-2" />
                    Teacher Actions
                </h3>
                <div className="flex flex-col gap-3">
                    <CustomButton
                        onClick={() => addNotification("Simulated: New Assignment Created", "Just now", "assignment")}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 shadow-md hover:shadow-emerald-500/10"
                        ariaLabel="Create a new assignment"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Create New Assignment
                    </CustomButton>
                    <CustomButton
                        onClick={() => addNotification("Simulated: Student Invited", "Just now", "repository")}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 shadow-md hover:shadow-purple-500/10"
                        ariaLabel="Invite new students"
                    >
                        <UserPlus className="h-4 w-4" />
                        Invite Students
                    </CustomButton>
                    <CustomButton
                        onClick={() => addNotification("Simulated: Grades Published", "Just now", "grade")}
                        className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 shadow-md hover:shadow-orange-500/10"
                        ariaLabel="Publish grades for assignments"
                    >
                        <BarChart className="h-4 w-4" />
                        Publish Grades
                    </CustomButton>
                </div>
            </div>
        );
    });
    MemoizedTeacherActions.displayName = 'MemoizedTeacherActions';


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-gray-900 to-neutral-900 text-white">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg text-blue-400">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

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
                            {userProfile ? (
                                <>
                                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                                        <img src={userProfile.avatarUrl} alt={`${userProfile.username}'s avatar`} className="w-6 h-6 rounded-full border border-blue-400" />
                                        <span>Hello, {userProfile.username}!</span>
                                    </div>
                                    <CustomButton
                                        onClick={handleLogout}
                                        className="bg-red-600/20 hover:bg-red-600/30 shadow-md hover:shadow-red-500/30 text-red-400"
                                        ariaLabel="Log out from GitHub Classroom"
                                    >
                                        <UserIcon className="w-4 h-4 inline mr-2" />
                                        Logout
                                    </CustomButton>
                                </>
                            ) : (
                                <>
                                    <CustomButton
                                        onClick={() => handleGitHubLogin(false)}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-blue-500/30 text-white"
                                        ariaLabel="Go to my GitHub repository"
                                    >
                                        <Github className="w-4 h-4 inline mr-2" />
                                        Login as Student
                                    </CustomButton>
                                    <CustomButton
                                        onClick={() => handleGitHubLogin(true)}
                                        className="bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800 shadow-md hover:shadow-purple-500/30 text-white"
                                        ariaLabel="Go to GitHub Classroom as a teacher"
                                    >
                                        <Book className="w-4 h-4 inline mr-2" />
                                        Login as Teacher
                                    </CustomButton>
                                </>
                            )}
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
                            className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                activeTab === lang
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                            }`}
                            aria-selected={activeTab === lang}
                            role="tab"
                            id={`tab-${lang}`}
                            aria-controls={`panel-${lang}`}
                        >
                            {getLanguageIcon(lang)}
                            <span className="capitalize">{lang === 'cpp' ? 'C++' : lang}</span>
                        </button>
                    ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Active Assignments', value: userProfile ? 'Dynamic' : 'N/A', icon: BookOpen, color: 'blue' },
                        { label: 'Submitted Today', value: userProfile ? 'Dynamic' : 'N/A', icon: Upload, color: 'emerald' },
                        { label: 'Pending Review', value: userProfile ? 'Dynamic' : 'N/A', icon: Clock, color: 'amber' },
                        { label: 'Completion Rate', value: userProfile ? 'Dynamic' : 'N/A', icon: CheckCircle, color: 'purple' }
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
                        <div className={cardClasses}>
                            <h3 className={headingClasses}>
                                <GitBranch className="w-5 h-5 mr-2" />
                                Git Operations & Console ({activeTab.toUpperCase()})
                            </h3>
                            {userProfile ? (
                                <MemoizedGitConsole
                                    currentGitStatus={gitStatus[activeTab]} // Use specific language git status
                                    isGitOperationInProgress={isGitOperationInProgress}
                                    handleGitPush={handleGitPush}
                                    handleGitPull={handleGitPull}
                                    activeTab={activeTab}
                                />
                            ) : (
                                <div className="text-center text-gray-500 py-8">Please sign in to perform Git operations.</div>
                            )}
                        </div>

                        {/* Assignments */}
                        <div className={cardClasses}>
                            <h3 className={headingClasses}>
                                <Code className="w-5 h-5 mr-2" />
                                {activeTab.toUpperCase()} Assignments
                            </h3>
                            <div className="space-y-4">
                                {userProfile && assignments[activeTab] && assignments[activeTab].length > 0 ? (
                                    assignments[activeTab].map((assignment) => (
                                        <div
                                            key={assignment.id}
                                            className={`bg-neutral-900/40 border rounded-lg p-4 transition-all duration-300 hover:border-blue-500/40 hover:transform hover:translate-x-2 shadow-md ${
                                                assignment.language === 'cpp' ? 'border-blue-500/20 hover:shadow-blue-500/10' :
                                                    assignment.language === 'java' ? 'border-red-500/20 hover:shadow-red-500/10' :
                                                        'border-yellow-500/20 hover:shadow-yellow-500/10'
                                            }`}
                                            role="listitem"
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
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 py-8" role="status">
                                        {userProfile ? `No assignments for ${activeTab.toUpperCase()} yet.` : 'Please sign in to see your assignments.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Live Notifications */}
                        <div className={cardClasses}>
                            <h3 className={headingClasses}>
                                <Bell className="w-5 h-5 mr-2" />
                                Live Notifications
                            </h3>
                            <div className="space-y-3" role="log" aria-live="polite">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className="bg-neutral-900/40 border-l-3 border-l-blue-500 rounded-r-lg p-3 transition-all duration-300 hover:bg-neutral-900/60 shadow-sm"
                                        role="status"
                                    >
                                        <p className="font-medium text-white text-sm">{notification.title}</p>
                                        <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* My Repositories */}
                        <MemoizedMyRepositories handleWheelEvent={handleWheelEvent} userRepositories={userRepositories} />

                        {/* Recent Projects */}
                        <div className={cardClasses}>
                            <h3 className={headingClasses}>
                                <FolderOpen className="w-5 h-5 mr-2" />
                                Recent Projects
                            </h3>
                            <MemoizedRecentProjects />
                        </div>

                        {/* Teacher Actions (Optional, show based on role) */}
                        <MemoizedTeacherActions addNotification={addNotification} isTeacher={userProfile?.isTeacher || false} />

                        {/* Help & AI Assist */}
                        <MemoizedHelpAndResources handleAIHelp={handleAIHelp} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GitHubClassroomDashboard;
