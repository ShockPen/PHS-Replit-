"use client";

import { BackgroundLines } from "@/app/components/ui/background-lines";
import {
    IconCoffee,
    IconFileTypeJs,
    IconBrandPython,
    IconBrandCpp,
    IconHome,
} from "@tabler/icons-react";
import { FloatingDock } from "@/app/components/ui/floating-dock";
import { FloatingNav } from "@/app/components/ui/floating-navbar";
import { Link } from "@nextui-org/react";

export default function Page() {
    const links = [
        {
            title: "Home",
            icon: (
                <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/studenthome",
        },
        {
            title: "Java",
            icon: (
                <IconCoffee className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/educatorhome/java",
        },
        {
            title: "Node.js",
            icon: (
                <IconFileTypeJs className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/educatorhome/node",
        },
        {
            title: "Python",
            icon: (
                <IconBrandPython className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/educatorhome/python",
        },
        {
            title: "C++",
            icon: (
                <IconBrandCpp className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/educatorhome/cpp",
        },
    ];

    return (
        <>
            <FloatingNav />
            <div className="h-screen w-full rounded-md bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
                <BackgroundLines className="flex items-center justify-center w-full flex-col px-4">
                    <div className="max-w-2xl mx-auto p-4">
                        <h1 className="relative z-10 text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center my-3 font-sans font-bold">
                            New Feature.
                        </h1>
                        <p className="text-neutral-500 max-w-lg mx-auto my-2 text-sm text-center relative z-10">
                            An in-progress feature coming soon to a SchoolNest browser near you.
                        </p>
                    </div>
                </BackgroundLines>

                <div className="absolute bottom-20 flex items-center justify-center w-full">
                    <FloatingDock
                        mobileClassName="translate-y-0"
                        items={links}
                    />
                </div>
            </div>
        </>
    );
}