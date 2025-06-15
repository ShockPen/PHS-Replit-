// utils/github.ts
// Utility functions for GitHub integration

export interface GitHubUser {
    id: number;
    login: string;
    name: string;
    email: string;
    avatar_url: string;
    html_url: string;
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
}

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    description: string;
    private: boolean;
    html_url: string;
    clone_url: string;
    updated_at: string;
    language: string;
    stargazers_count: number;
    forks_count: number;
}

export interface CreateRepoOptions {
    name: string;
    description?: string;
    isPrivate?: boolean;
    autoInit?: boolean;
    gitignoreTemplate?: string;
    licenseTemplate?: string;
    allowSquashMerge?: boolean;
    allowMergeCommit?: boolean;
    allowRebaseMerge?: boolean;
    hasIssues?: boolean;
    hasProjects?: boolean;
    hasWiki?: boolean;
}

export class GitHubService {
    private static async makeRequest(endpoint: string, options: RequestInit = {}) {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Check if user has GitHub connected
    static async isGitHubConnected(): Promise<boolean> {
        try {
            await this.getCurrentUser();
            return true;
        } catch {
            return false;
        }
    }

    // Get current authenticated GitHub user
    static async getCurrentUser(): Promise<GitHubUser> {
        return this.makeRequest('/api/github/user');
    }

    // Get user's repositories
    static async getUserRepositories(): Promise<GitHubRepository[]> {
        const data = await this.makeRequest('/api/github/user', { method: 'POST' });
        return data.repositories;
    }

    // Create a new repository
    static async createRepository(options: CreateRepoOptions) {
        return this.makeRequest('/api/github/create-repo', {
            method: 'POST',
            body: JSON.stringify(options),
        });
    }

    // Pull file from repository
    static async pullFile(owner: string, repo: string, path: string = 'README.md'): Promise<string> {
        const params = new URLSearchParams({ owner, repo, path });
        const data = await this.makeRequest(`/api/github/pull?${params}`);
        return data.content;
    }

    // Push file to repository
    static async pushFile(
        owner: string,
        repo: string,
        path: string,
        content: string,
        message: string
    ) {
        return this.makeRequest('/api/github/push', {
            method: 'POST',
            body: JSON.stringify({ owner, repo, path, content, message }),
        });
    }

    // Get available templates
    static async getTemplates() {
        return this.makeRequest('/api/github/create-repo');
    }

    // Connect GitHub account
    static connectGitHub(redirectTo: string = '/dashboard') {
        window.location.href = `/api/github/auth?redirect=${encodeURIComponent(redirectTo)}`;
    }

    // Disconnect GitHub account
    static async disconnectGitHub() {
        await this.makeRequest('/api/github/callback', { method: 'DELETE' });
        window.location.reload();
    }
}

// React hooks for GitHub integration
import { useState, useEffect } from 'react';

export function useGitHubAuth() {
    const [user, setUser] = useState<GitHubUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    const checkConnection = async () => {
        setIsLoading(true);
        try {
            const userData = await GitHubService.getCurrentUser();
            setUser(userData);
            setIsConnected(true);
        } catch {
            setUser(null);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    return {
        user,
        isConnected,
        isLoading,
        refresh: checkConnection,
        connect: GitHubService.connectGitHub,
        disconnect: GitHubService.disconnectGitHub,
    };
}

export function useGitHubRepositories() {
    const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRepositories = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const repos = await GitHubService.getUserRepositories();
            setRepositories(repos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
        } finally {
            setIsLoading(false);
        }
    };

    const createRepository = async (options: CreateRepoOptions) => {
        try {
            const result = await GitHubService.createRepository(options);
            await fetchRepositories(); // Refresh the list
            return result;
        } catch (err) {
            throw err;
        }
    };

    useEffect(() => {
        fetchRepositories();
    }, []);

    return {
        repositories,
        isLoading,
        error,
        refresh: fetchRepositories,
        createRepository,
    };
}

// Component for GitHub connection status
export function GitHubConnectionStatus() {
    const { user, isConnected, isLoading, connect, disconnect } = useGitHubAuth();

    if (isLoading) {
        return <div className="text-gray-500">Checking GitHub connection...</div>;
    }

    if (!isConnected) {
        return (
            <div className="flex items-center gap-3 p-4 border rounded-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>GitHub not connected</span>
        <button
        onClick={() => connect()}
        className="ml-auto px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            >
            Connect GitHub
        </button>
        </div>
    );
    }

    return (
        <div className="flex items-center gap-3 p-4 border rounded-lg">
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <img src={user?.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full" />
        <span>Connected as {user?.login}</span>
        <button
    onClick={disconnect}
    className="ml-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
        Disconnect
        </button>
        </div>
);
}