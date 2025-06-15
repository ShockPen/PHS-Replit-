"use client";
import React, { useState } from "react";
import {
    motion,
    AnimatePresence,
    useScroll,
    useMotionValueEvent,
} from "framer-motion";
import { cn } from "@/app/lib/utils";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { IconHome, IconDirections, IconSchool, IconUser } from "@tabler/icons-react";

import ThemeSwitcher from "../ThemeSwitcher";

export const FloatingNav = ({
                                className,
                            }: {
    navItems?: {
        name: string;
        link: string;
        icon?: JSX.Element;
    }[];
    className?: string;
}) => {

    const { data: session, status } = useSession();
    const { scrollYProgress } = useScroll();

    const [visible, setVisible] = useState(true);

    useMotionValueEvent(scrollYProgress, "change", (current) => {
        // Check if current is not undefined and is a number
        if (typeof current === "number") {
            let direction = current! - scrollYProgress.getPrevious()!;

            if (scrollYProgress.get() < 0.05) {
                setVisible(true);
            } else {
                if (direction < 0) {
                    setVisible(true);
                } else {
                    setVisible(true);
                }
            }
        }
    });

    // Get user type from session
    const userType = session?.user?.userType as "student" | "educator" | undefined;
    const schoolAbbr = session?.user?.school_abbr as string | undefined;

    // Create dynamic nav items based on user type
    const getNavItems = () => {
        const baseNavItems = [
            {
                name: "Home",
                link: "/",
                icon: <IconHome className="h-4 w-4" />,
            }
        ];

        // Add user-specific home link if user is logged in
        if (session && userType) {
            const userHomeItem = {
                name: userType === "student" ? "Student Home" : "Educator Home",
                link: userType === "student" ? "/studenthome" : "/educatorhome",
                icon: <IconUser className="h-4 w-4" />,
            };
            baseNavItems.push(userHomeItem);
        }

        return baseNavItems;
    };

    const navItems = getNavItems();

    // Show loading state while session is being fetched
    if (status === "loading") {
        return (
            <motion.div
                className={cn(
                    "flex max-w-fit fixed top-10 inset-x-0 mx-auto border border-transparent dark:border-white/[0.2] rounded-full dark:bg-black bg-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-4 py-2 items-center justify-center space-x-4",
                    className
                )}
            >
                <div className="animate-pulse">Loading...</div>
            </motion.div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{
                    opacity: 1,
                    y: -100,
                }}
                animate={{
                    y: visible ? 0 : -100,
                    opacity: visible ? 1 : 0,
                }}
                transition={{
                    duration: 0.2,
                }}
                className={cn(
                    "flex max-w-fit fixed top-10 inset-x-0 mx-auto border border-transparent dark:border-white/[0.2] rounded-full dark:bg-black bg-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-4 py-2 items-center justify-center space-x-4",
                    className
                )}
            >
                <div className="flex space-x-4 justify-center md:flex-row">
                    {navItems.map((navItem: any, idx: number) => (
                        <Link
                            key={`link=${idx}`}
                            href={navItem.link}
                            className={cn(
                                "relative dark:text-neutral-50 items-center flex space-x-1 text-neutral-600 dark:hover:text-neutral-300 hover:text-neutral-500 transition-colors"
                            )}
                        >
                            <span className="block sm:hidden">{navItem.icon}</span>
                            <span className="hidden sm:block text-sm">{navItem.name}</span>
                        </Link>
                    ))}
                </div>

                {/* Show login/register buttons when not authenticated */}
                {!session && (
                    <>
                        <Link href="/login">
                            <button className="border text-sm font-medium relative border-neutral-200 dark:border-white/[0.2] text-black dark:text-white px-4 py-2 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                <span>Login</span>
                                <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px bg-gradient-to-r from-transparent via-blue-500 to-transparent h-px" />
                            </button>
                        </Link>
                        <Link href="/register">
                            <button className="border text-sm font-medium relative border-neutral-200 dark:border-white/[0.2] text-black dark:text-white px-4 py-2 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                <span>Register</span>
                                <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px bg-gradient-to-r from-transparent via-blue-500 to-transparent h-px" />
                            </button>
                        </Link>
                    </>
                )}

                {/* Show user-specific content when authenticated */}
                {session && (
                    <>
                        {/* School link if user has school_abbr */}
                        {schoolAbbr && (
                            <Link
                                href={`/${schoolAbbr}`}
                                className={cn(
                                    "relative dark:text-neutral-50 items-center flex space-x-1 text-neutral-600 dark:hover:text-neutral-300 hover:text-neutral-500 transition-colors"
                                )}
                            >
                                <span className="block sm:hidden">
                                    <IconSchool className="h-4 w-4" />
                                </span>
                                <span className="hidden sm:block text-sm">{schoolAbbr}</span>
                            </Link>
                        )}

                        {/* User type indicator */}
                        <div className="flex items-center space-x-1 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full">
                            <span className="capitalize">{userType}</span>
                        </div>

                        {/* Logout button */}
                        <button
                            className="border text-sm font-medium relative border-neutral-200 dark:border-white/[0.2] text-black dark:text-white px-4 py-2 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            onClick={() => signOut({ callbackUrl: '/', redirect: true })}
                        >
                            <span>Logout</span>
                            <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px bg-gradient-to-r from-transparent via-blue-500 to-transparent h-px" />
                        </button>
                    </>
                )}

                <ThemeSwitcher />
            </motion.div>
        </AnimatePresence>
    );
};