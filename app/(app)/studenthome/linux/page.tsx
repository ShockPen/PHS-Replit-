"use client"

import dynamic from "next/dynamic"

// Dynamic import with optimized loading
const XTermLoader = dynamic(() => import("./XTermLoader"), {
    ssr: false,
    loading: () => (
        <div className="h-screen bg-[#1e1e1e] flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                <div className="text-green-400 font-mono text-lg">Loading terminal...</div>
                <div className="text-gray-400 font-mono text-sm mt-2">Preparing Linux environment</div>
            </div>
        </div>
    ),
})

export default function LinuxTerminal() {
    return (
        <div className="w-full h-screen overflow-hidden bg-[#1e1e1e]">
            <XTermLoader />
        </div>
    )
}
