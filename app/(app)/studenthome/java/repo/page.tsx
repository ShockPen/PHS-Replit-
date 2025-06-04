"use client";

import { BackgroundLines } from "@/app/components/ui/background-lines";
import {
    IconHome,
    IconCoffee,
    IconFileCode,
    IconTemplate,
    IconSchool,
    IconGitBranch,
    IconGitCommit,
    IconGitMerge,
    IconGitPullRequest,
    IconCloudUpload,
    IconCloudDownload,
    IconFolderPlus,
    IconGitFork,
    IconHistory,
    IconSettings,
    IconTrash,
    IconCopy,
    IconBrandGithub,
    IconUpload,
    IconFileDownload
} from "@tabler/icons-react";
import { FloatingNav } from "@/app/components/ui/floating-navbar";
import { Button, Link } from "@nextui-org/react";
import { BentoGrid, BentoGridItem } from "@/app/components/ui/bento-grid";
import { GitBranch, Play, Upload, Download, FileText, Folder, Code } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface File {
    filename: string;
    contents: string;
}

interface Project {
    project_name: string,
    files: File[]
}

export default function Page() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    // State from IDE integration
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
}`,
        }
    ]);

    const [activeFile, setActiveFile] = useState('Main.java');
    const [signedIn, setSignedIn] = useState(false);
    const [name, setName] = useState('');
    const [project, setProject] = useState(searchParams.get("project") ?? "");
    const [projectList, setProjectList] = useState<string[]>([]);
    const [repoName, setRepoName] = useState("");
    const [createdRepos, setCreatedRepos] = useState<{ owner: string; name: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize session and load project data
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
                if (project) {
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
                    }
                }
            }
            getProjectFiles();

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
    }, [session, project]);

    // Save project functionality from IDE
    const saveProject = async () => {
        try {
            const response = await fetch('/api/student/save_files/post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ project, files })
            });
            if (response.ok) {
                alert('Project saved successfully!');
            }
        } catch (errors: any) {
            console.log(errors);
            alert('Error saving project');
        }
    }

    // GitHub functionality from IDE
    const createRepo = async (repoName: string) => {
        const res = await fetch("/api/github/create-repo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: repoName.trim(),
                description: "Created via Schoolnest Repository Manager",
                isPrivate: true,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            if (data.error?.errors?.some((e: any) => e.message.includes("already exists"))) {
                alert("Repository name already exists. Please choose a different name.");
            } else {
                alert("Failed to create repo: " + (data.error?.message || data.error));
            }
            return null;
        }

        alert(`Repo "${repoName}" created successfully!`);
        return data;
    };

    const handlePush = async (owner: string, repo: string) => {
        const file = files.find((f) => f.filename === activeFile);
        if (!file) {
            alert("No file selected.");
            return;
        }

        const res = await fetch("/api/github/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `token ${session?.accessToken}`,
            },
            body: JSON.stringify({
                owner,
                repo,
                path: file.filename,
                content: file.contents,
                message: "Schoolnest Repository Manager Commit",
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            alert("Push failed: " + (errorData.error || "Unknown error"));
        } else {
            alert("File pushed successfully!");
        }
    };

    const handleCreateAndPush = async () => {
        let chosenRepo: { owner: string; name: string } | null = null;

        if (createdRepos.length > 0) {
            const repoNames = createdRepos.map((r, i) => `${i + 1}: ${r.name}`).join("\n");
            const input = prompt(
                `You have created these repositories this session:\n${repoNames}\n\n` +
                `Enter the number of the repo to push to, or leave empty to create a new repo:`
            );

            if (input) {
                const index = parseInt(input, 10) - 1;
                if (!isNaN(index) && createdRepos[index]) {
                    chosenRepo = createdRepos[index];
                } else {
                    alert("Invalid selection, creating a new repo.");
                }
            }
        }

        if (!chosenRepo) {
            const repoName = prompt("Enter new repository name:");
            if (!repoName || repoName.trim() === "") {
                alert("Repository name is required.");
                return;
            }

            const newRepo = await createRepo(repoName);
            if (!newRepo) return;

            chosenRepo = { owner: newRepo.owner.login, name: newRepo.name };
            setCreatedRepos((prev) => [...prev, chosenRepo!]);
        }

        await handlePush(chosenRepo.owner, chosenRepo.name);
    };

    // File upload functionality from IDE
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target?.result as string;
            const newFile = {
                filename: file.name,
                contents,
            };
            setFiles((prev) => [...prev, newFile]);
            setActiveFile(file.name);
            alert(`File "${file.name}" uploaded successfully!`);
        };
        reader.readAsText(file);
    };

    // Get file statistics for dynamic display
    const getFileStats = () => {
        const totalFiles = files.length;
        const javaFiles = files.filter(f => f.filename.endsWith('.java')).length;
        const otherFiles = totalFiles - javaFiles;
        const totalLines = files.reduce((acc, file) => acc + file.contents.split('\n').length, 0);
        const avgLinesPerFile = totalFiles > 0 ? Math.round(totalLines / totalFiles) : 0;

        return {
            totalFiles,
            javaFiles,
            otherFiles,
            totalLines,
            avgLinesPerFile,
            fileTypes: [...new Set(files.map(f => f.filename.split('.').pop()?.toLowerCase() || 'unknown'))]
        };
    };

    const fileStats = getFileStats();

    const handleGitOperation = (operationName: string) => {
        switch (operationName) {
            case "Clone Repository":
                const cloneUrl = prompt("Enter repository URL to clone:");
                if (cloneUrl) {
                    alert(`Cloning ${cloneUrl}... This would be implemented with backend integration.`);
                }
                break;
            case "Create Repository":
                const newRepoName = prompt("Enter repository name:");
                if (newRepoName) {
                    createRepo(newRepoName).then(repo => {
                        if (repo) {
                            setCreatedRepos(prev => [...prev, { owner: repo.owner.login, name: repo.name }]);
                        }
                    });
                }
                break;
            case "Push Changes":
                if (files.length === 0) {
                    alert("No files to push. Please upload or create files first.");
                    return;
                }
                handleCreateAndPush();
                break;
            case "Save Project":
                saveProject();
                break;
            case "Upload File":
                fileInputRef.current?.click();
                break;
            default:
                router.push(`/studenthome/git/terminal?operation=${encodeURIComponent(operationName)}`);
        }
    };

    class GitOperationCard extends React.Component<{
        title: any,
        description: any,
        icon: any,
        color: string,
        command?: string,
        isSpecial?: boolean
    }> {
        static defaultProps = {color: "blue", isSpecial: false}

        render() {
            let {title, description, icon, color, command, isSpecial} = this.props;
            return (
                <div className={`w-full h-full bg-black border border-${color}-500/30 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-${color}-500/20 transition-all duration-300 hover:scale-[1.02] overflow-hidden hover:border-${color}-400/50`}>
                    <div className="p-6 h-full flex flex-col">
                        {/* Header */}
                        <div className={`flex items-center gap-3 mb-4 text-${color}-400`}>
                            {icon}
                            <h3 className={`text-lg font-semibold text-${color}-300`}>{title}</h3>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-blue-200 leading-relaxed mb-4 flex-1">
                            {description}
                        </p>

                        {/* Command */}
                        {command && (
                            <div className="bg-gray-900/70 rounded-lg p-3 border border-blue-500/30 mb-4">
                                <code className="text-xs text-cyan-400 font-mono">{command}</code>
                            </div>
                        )}

                        {/* Dynamic file info for special operations */}
                        {isSpecial && (
                            <div className={`bg-${color}-900/20 rounded-lg p-3 border border-${color}-500/30 mb-4`}>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className={`text-${color}-300`}>
                                            <span className="font-medium">Total Files:</span> {fileStats.totalFiles}
                                        </div>
                                        <div className={`text-${color}-300`}>
                                            <span className="font-medium">Java Files:</span> {fileStats.javaFiles}
                                        </div>
                                        <div className={`text-${color}-300`}>
                                            <span className="font-medium">Total Lines:</span> {fileStats.totalLines}
                                        </div>
                                        <div className={`text-${color}-300`}>
                                            <span className="font-medium">Avg Lines:</span> {fileStats.avgLinesPerFile}
                                        </div>
                                    </div>
                                    {fileStats.totalFiles > 0 && (
                                        <>
                                            <div className={`text-xs text-${color}-300`}>
                                                <span className="font-medium">File Types:</span> {fileStats.fileTypes.join(', ')}
                                            </div>
                                            <div className={`text-xs text-${color}-400 max-h-16 overflow-y-auto`}>
                                                <span className="font-medium">Files:</span> {files.map(f => f.filename).join(', ')}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Execute Button */}
                        <div className="mt-auto pt-4 border-t border-blue-500/20">
                            <Button
                                onClick={() => handleGitOperation(title)}
                                className={`w-full bg-gradient-to-r from-${color}-600 to-${color}-800 hover:from-${color}-500 hover:to-${color}-700 text-white font-medium rounded-lg px-4 py-2.5 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-${color}-500/25 border border-${color}-500/30`}
                            >
                                <Play className="h-4 w-4"/>
                                Execute
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }
    }

    const links = [
        {
            title: "Home",
            icon: (
                <IconHome className="h-full w-full text-blue-400 dark:text-blue-300" />
            ),
            href: "/studenthome",
        },
        {
            title: "Dashboard",
            icon: (
                <IconCoffee className="h-full w-full text-blue-400 dark:text-blue-300" />
            ),
            href: "/studenthome/java",
        },
        {
            title: "Java IDE",
            icon: (
                <IconTemplate className="h-full w-full text-blue-400 dark:text-blue-300" />
            ),
            href: "/studenthome/java/ide",
        },
        {
            title: "Classes",
            icon: (
                <IconGitBranch className="h-full w-full text-blue-400 dark:text-blue-300" />
            ),
            href: "/studenthome/classes",
        },
        {
            title: "Terminal",
            icon: (
                <IconFileCode className="h-full w-full text-blue-400 dark:text-blue-300" />
            ),
            href: "/studenthome/linux",
        },
    ];

    const gitOperations = [
        {
            title: "Upload File",
            description: `Upload files from your computer. Currently supports ${fileStats.fileTypes.length > 0 ? fileStats.fileTypes.join(', ') : 'Java, text, and source code'} files. You have ${fileStats.totalFiles} files loaded.`,
            icon: <IconUpload className="h-6 w-6" />,
            color: "blue",
            command: `Upload via file picker • Current: ${fileStats.totalFiles} files`,
            isSpecial: true,
        },
        {
            title: "Save Project",
            description: `Save your ${fileStats.totalFiles} project files (${fileStats.totalLines} total lines) to the server. This preserves your work across sessions.`,
            icon: <IconFileDownload className="h-6 w-6" />,
            color: "green",
            command: `Save ${fileStats.totalFiles} files to server storage`,
            isSpecial: true,
        },
        {
            title: "Create Repository",
            description: `Initialize a new Git repository on GitHub for your ${fileStats.totalFiles} files. Creates a remote repository for version control.`,
            icon: <IconFolderPlus className="h-6 w-6" />,
            color: "purple",
            command: `Create new GitHub repo for ${fileStats.totalFiles} files`,
            isSpecial: true,
        },
        {
            title: "Push Changes",
            description: `Upload your ${fileStats.totalFiles} project files (${fileStats.javaFiles} Java files, ${fileStats.otherFiles} other files) to GitHub repository.`,
            icon: <IconCloudUpload className="h-6 w-6" />,
            color: "orange",
            command: `git push ${fileStats.totalFiles} files with ${fileStats.totalLines} lines`,
            isSpecial: true,
        },
        {
            title: "Clone Repository",
            description: "Create a local copy of a remote repository on your machine. This downloads all files, branches, and commit history.",
            icon: <IconCopy className="h-6 w-6" />,
            color: "cyan",
            command: "git clone <repository-url>",
        },
        {
            title: "Pull Changes",
            description: "Download and merge changes from a remote repository into your current branch. Stay synchronized with team updates.",
            icon: <IconCloudDownload className="h-6 w-6" />,
            color: "teal",
            command: "git pull origin main",
        },
        {
            title: "Commit Changes",
            description: "Save your staged changes to the repository with a descriptive message. Create a snapshot of your project's current state.",
            icon: <IconGitCommit className="h-6 w-6" />,
            color: "emerald",
            command: 'git commit -m "Your message"',
        },
        {
            title: "Merge Branches",
            description: "Combine changes from different branches into one. Integrate feature branches back into your main development line.",
            icon: <IconGitMerge className="h-6 w-6" />,
            color: "violet",
            command: "git merge feature-branch",
        },
        {
            title: "Rebase",
            description: "Reapply commits on top of another base tip. Clean up commit history and create a linear project timeline.",
            icon: <IconHistory className="h-6 w-6" />,
            color: "indigo",
            command: "git rebase main",
        },
        {
            title: "Create Branch",
            description: "Create a new branch for feature development or experimentation. Work on isolated changes without affecting main code.",
            icon: <IconGitBranch className="h-6 w-6" />,
            color: "sky",
            command: "git checkout -b new-branch",
        },
        {
            title: "Fork Repository",
            description: "Create a personal copy of someone else's repository. Contribute to open source projects or customize existing code.",
            icon: <IconGitFork className="h-6 w-6" />,
            color: "pink",
            command: "Fork via GitHub UI",
        },
        {
            title: "Pull Request",
            description: "Propose changes to a repository by requesting that your changes be pulled into the main branch. Collaborate and review code.",
            icon: <IconGitPullRequest className="h-6 w-6" />,
            color: "rose",
            command: "Create via GitHub UI",
        },
    ];

    const items = gitOperations.map((operation, index) => ({
        title: "",
        description: "",
        header: <GitOperationCard {...operation} />,
        className: "md:col-span-1",
        icon: null,
    }));

    return (
        <>
            <FloatingNav />
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept=".java,.txt,.js,.py,.cpp,.c,.h,.css,.html,.json,.xml,.md"
            />
            <div className="min-h-screen w-full bg-black relative flex flex-col items-center antialiased">
                {/* Hero Section */}
                <BackgroundLines className="flex items-center justify-center w-full flex-col px-4 py-20 bg-black">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2 mb-6">
                            <GitBranch className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-blue-300 font-medium">Version Control</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-b from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-6">
                            Your Repository
                        </h1>

                        <p className="text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed mb-4">
                            Master Git operations and repository management with integrated file handling.
                            Upload files, save projects, create repositories, and push code to GitHub.
                        </p>

                        {signedIn && (
                            <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-blue-500/30 backdrop-blur-sm">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="text-blue-400 font-bold text-lg">{fileStats.totalFiles}</div>
                                        <div className="text-blue-300">Total Files</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-green-400 font-bold text-lg">{fileStats.javaFiles}</div>
                                        <div className="text-green-300">Java Files</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-purple-400 font-bold text-lg">{fileStats.totalLines}</div>
                                        <div className="text-purple-300">Total Lines</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-cyan-400 font-bold text-lg">{fileStats.fileTypes.length}</div>
                                        <div className="text-cyan-300">File Types</div>
                                    </div>
                                </div>
                                {signedIn && (
                                    <div className="mt-3 pt-3 border-t border-blue-500/20 text-center">
                                        <p className="text-sm text-blue-300">
                                            Welcome, <span className="text-blue-400 font-medium">{name}</span>
                                            {project && <> • Project: <span className="text-green-400 font-medium">{project}</span></>}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-4 text-sm text-blue-400">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span>Git Ready</span>
                            </div>
                            <div className="w-px h-4 bg-blue-600"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>File Management</span>
                            </div>
                            <div className="w-px h-4 bg-blue-600"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                <span>GitHub Integration</span>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <div className="flex justify-center mt-12">
                            <div className="flex space-x-4 p-4 bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-blue-500/30 shadow-2xl">
                                {links.map((link, index) => (
                                    <div key={index} className="relative group">
                                        <Link
                                            href={link.href}
                                            className="flex items-center justify-center w-14 h-14 bg-black/70 backdrop-blur-sm hover:bg-gray-800/90 rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-2 border border-blue-500/30 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
                                        >
                                            {React.cloneElement(link.icon, {
                                                className: "h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-200"
                                            })}
                                        </Link>

                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-blue-200 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 pointer-events-none border border-blue-500/30 shadow-xl">
                                            {link.title}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </BackgroundLines>

                {/* Git Operations Grid */}
                <div className="w-full max-w-7xl mx-auto px-6 pb-32 bg-black">
                    <BentoGrid className="md:auto-rows-auto gap-6">
                        {items.map((item, i) => (
                            <BentoGridItem
                                key={i}
                                title={item.title}
                                description={item.description}
                                header={item.header}
                                className={`${item.className} bg-transparent border-0 p-0 overflow-visible`}
                                icon={item.icon}
                            />
                        ))}
                    </BentoGrid>
                </div>
            </div>
        </>
    );
}