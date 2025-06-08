"use client";

import { BackgroundLines } from "@/app/components/ui/background-lines";
import { FloatingNav } from "@/app/components/ui/floating-navbar";
import { IconClock, IconRocket } from "@tabler/icons-react";

export default function ComingSoonPage() {
    return (
        <>
            <FloatingNav />
            <div className="h-screen w-full rounded-md bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
                <BackgroundLines className="flex items-center justify-center w-full flex-col px-4">
                    <div className="max-w-2xl mx-auto p-4">
                        <div className="flex justify-center mb-8">
                            <div className="relative">
                                <IconRocket className="h-16 w-16 text-neutral-400 animate-pulse" />
                                <IconClock className="h-8 w-8 text-red-400 absolute -top-2 -right-2" />
                            </div>
                        </div>

                        <h1 className="relative z-10 text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center font-sans font-bold">
                            New Feature Coming Soon
                        </h1>

                        <p className="text-neutral-500 max-w-lg mx-auto my-6 text-sm md:text-base text-center relative z-10">
                            We&apos;re working hard to bring you something amazing. This exciting new feature will enhance your SchoolNest experience and take your computer science teaching to the next level.
                        </p>

                        <div className="flex justify-center mt-8">
                            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-red-800 to-red-600 text-white text-sm font-medium">
                                <IconClock className="h-4 w-4 mr-2" />
                                Stay Tuned
                            </div>
                        </div>
                    </div>
                </BackgroundLines>
            </div>
        </>
    );
}