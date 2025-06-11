import React, { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@nextui-org/react'
import { IconBrandGithub, IconCheck, IconX, IconLoader } from '@tabler/icons-react'

interface GitHubAuthProps {
    onAuthSuccess?: () => void
    requiredScopes?: string[]
}

export default function GitHubAuth({ onAuthSuccess, requiredScopes = ['repo'] }: GitHubAuthProps) {
    const { data: session, status } = useSession()
    const [isConnecting, setIsConnecting] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)

    useEffect(() => {
        if (session?.accessToken && onAuthSuccess) {
            onAuthSuccess()
        }
    }, [session, onAuthSuccess])

    const handleGitHubConnect = async () => {
        setIsConnecting(true)
        setAuthError(null)

        try {
            await signIn('github', {
                callbackUrl: window.location.href,
                redirect: false
            })
        } catch (error) {
            console.error('GitHub authentication error:', error)
            setAuthError('Failed to connect to GitHub. Please try again.')
        } finally {
            setIsConnecting(false)
        }
    }

    const handleDisconnect = async () => {
        try {
            await signOut({ redirect: false })
            setAuthError(null)
        } catch (error) {
            console.error('Disconnect error:', error)
            setAuthError('Failed to disconnect. Please try again.')
        }
    }

    if (status === 'loading') {
        return (
            <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg border border-blue-500/30">
                <IconLoader className="h-5 w-5 text-blue-400 animate-spin" />
                <span className="text-blue-200">Checking authentication...</span>
            </div>
        )
    }

    if (session?.accessToken) {
        return (
            <div className="space-y-4">
                {/* Connected Status */}
                <div className="flex items-center gap-3 p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                    <IconCheck className="h-5 w-5 text-green-400" />
                    <div className="flex-1">
                        <p className="text-green-300 font-medium">
                            Connected to GitHub as @{session.githubUsername}
                        </p>
                        <p className="text-green-400/80 text-sm">
                            Ready to create repositories and manage code
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDisconnect}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                        Disconnect
                    </Button>
                </div>

                {/* Permissions Info */}
                <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <p className="text-blue-300 text-sm font-medium mb-2">Active Permissions:</p>
                    <div className="flex flex-wrap gap-2">
                        {requiredScopes.map((scope) => (
                            <span
                                key={scope}
                                className="px-2 py-1 bg-blue-800/30 text-blue-300 text-xs rounded-md border border-blue-500/20"
                            >
                {scope}
              </span>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Authentication Required */}
            <div className="p-6 bg-yellow-900/20 rounded-lg border border-yellow-500/30 text-center">
                <IconBrandGithub className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-yellow-300 font-semibold mb-2">GitHub Authentication Required</h3>
                <p className="text-yellow-200/80 text-sm mb-4">
                    Connect your GitHub account to create repositories, push code, and manage your projects.
                </p>

                <Button
                    onClick={handleGitHubConnect}
                    disabled={isConnecting}
                    className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                >
                    {isConnecting ? (
                        <>
                            <IconLoader className="h-5 w-5 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            <IconBrandGithub className="h-5 w-5" />
                            Connect GitHub Account
                        </>
                    )}
                </Button>

                {authError && (
                    <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                        <div className="flex items-center gap-2">
                            <IconX className="h-4 w-4 text-red-400" />
                            <p className="text-red-300 text-sm">{authError}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Required Permissions */}
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-500/30">
                <p className="text-gray-300 font-medium mb-2">Required GitHub Permissions:</p>
                <ul className="space-y-1 text-sm text-gray-400">
                    <li>• Create and manage repositories</li>
                    <li>• Read and write repository contents</li>
                    <li>• Access user profile information</li>
                    <li>• Manage repository settings</li>
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                    Your tokens are securely managed and never stored permanently.
                </p>
            </div>
        </div>
    )
}