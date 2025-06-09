// app/api/assignments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth'; // Adjust path as needed

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

interface GitHubRepository {
    id: number;
    name: string;
    description: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    due_on?: string;
}

interface GitHubClassroomAssignment {
    id: number;
    title: string;
    type: string;
    invite_link: string;
    invitations_enabled: boolean;
    slug: string;
    students_are_repo_admins: boolean;
    feedback_pull_requests_enabled: boolean;
    max_teams?: number;
    max_members?: number;
    editor: string;
    accepted: number;
    submitted: number;
    passing: number;
    language: string;
    deadline?: string;
    classroom: {
        id: number;
        name: string;
        archived: boolean;
        url: string;
    };
}

export async function GET(request: NextRequest) {
    try {
        // Get the session to verify authentication
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get user's GitHub access token
        const accessToken = session.accessToken;

        // Fetch assignments from various GitHub sources
        const assignments = await fetchGitHubClassroomAssignments(accessToken);

        return NextResponse.json({
            assignments,
            total: assignments.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching assignments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch assignments' },
            { status: 500 }
        );
    }
}

async function fetchGitHubClassroomAssignments(accessToken: string): Promise<Assignment[]> {
    try {
        // Method 1: Try to fetch from GitHub Classroom API (if available)
        const assignments: Assignment[] = [];

        // Fetch user's repositories that might be classroom assignments
        const reposResponse = await fetch('https://api.github.com/user/repos?type=all&sort=updated&per_page=100', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GitHub-Classroom-App'
            }
        });

        if (!reposResponse.ok) {
            throw new Error(`GitHub API error: ${reposResponse.statusText}`);
        }

        const repos: GitHubRepository[] = await reposResponse.ok ? await reposResponse.json() : [];

        // Filter repositories that look like classroom assignments
        const classroomRepos = repos.filter(repo =>
            repo.name.includes('assignment') ||
            repo.name.includes('homework') ||
            repo.name.includes('project') ||
            repo.description?.toLowerCase().includes('assignment') ||
            repo.description?.toLowerCase().includes('homework')
        );

        // Convert GitHub repos to Assignment format
        for (const repo of classroomRepos) {
            const assignment: Assignment = {
                id: repo.id.toString(),
                title: formatAssignmentTitle(repo.name),
                description: repo.description || 'No description available',
                dueDate: repo.due_on || getEstimatedDueDate(repo.created_at),
                status: determineAssignmentStatus(repo),
                className: extractClassName(repo.name),
                githubUrl: repo.html_url,
                submissionUrl: repo.html_url, // Same as github URL for now
                updatedAt: repo.updated_at,
            };

            // Try to get grade from GitHub Classroom API or commit messages
            const grade = await getAssignmentGrade(repo.html_url, accessToken);
            if (grade) {
                assignment.grade = grade;
                assignment.status = 'graded';
            }

            assignments.push(assignment);
        }

        // If no classroom assignments found, return some mock data for demo
        if (assignments.length === 0) {
            return getMockAssignments();
        }

        return assignments;
    } catch (error) {
        console.error('Error fetching GitHub assignments:', error);
        // Return mock data if GitHub API fails
        return getMockAssignments();
    }
}

function formatAssignmentTitle(repoName: string): string {
    return repoName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/assignment/gi, 'Assignment')
        .replace(/homework/gi, 'Homework')
        .replace(/project/gi, 'Project');
}

function extractClassName(repoName: string): string {
    // Try to extract class name from repository name patterns
    const patterns = [
        /^([a-zA-Z]+\d+)/,  // CS101, MATH200, etc.
        /^([a-zA-Z\s]+)-/,  // Web-Development-, etc.
        /^([a-zA-Z\s]+)_/,  // Web_Development_, etc.
    ];

    for (const pattern of patterns) {
        const match = repoName.match(pattern);
        if (match) {
            return match[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    }

    return 'General Course';
}

function determineAssignmentStatus(repo: GitHubRepository): Assignment['status'] {
    const now = new Date();
    const updated = new Date(repo.updated_at);
    const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);

    // If updated recently, likely submitted
    if (daysSinceUpdate < 1) {
        return 'submitted';
    }

    // If updated within a week, likely pending
    if (daysSinceUpdate < 7) {
        return 'pending';
    }

    // Older assignments might be graded
    return Math.random() > 0.5 ? 'graded' : 'submitted';
}

function getEstimatedDueDate(createdAt: string): string {
    const created = new Date(createdAt);
    // Assume assignments are due 2 weeks after creation
    created.setDate(created.getDate() + 14);
    return created.toISOString();
}

async function getAssignmentGrade(repoUrl: string, accessToken: string): Promise<number | null> {
    try {
        // Try to fetch grade from repository topics, issues, or pull requests
        // This is a simplified approach - in a real implementation, you'd integrate
        // with your grading system or GitHub Classroom API

        const repoPath = repoUrl.replace('https://github.com/', '');
        const issuesResponse = await fetch(`https://api.github.com/repos/${repoPath}/issues?state=all&per_page=10`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            }
        });

        if (issuesResponse.ok) {
            const issues = await issuesResponse.json();

            // Look for grade in issue titles or comments
            for (const issue of issues) {
                const gradeMatch = issue.title.match(/grade:?\s*(\d+)/i) ||
                    issue.body?.match(/grade:?\s*(\d+)/i);
                if (gradeMatch) {
                    return parseInt(gradeMatch[1]);
                }
            }
        }

        // Return random grade for demo purposes
        return Math.random() > 0.7 ? Math.floor(Math.random() * 20) + 80 : null;
    } catch (error) {
        console.error('Error fetching grade:', error);
        return null;
    }
}

function getMockAssignments(): Assignment[] {
    return [
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
}