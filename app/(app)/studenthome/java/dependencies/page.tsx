"use client";

import { BackgroundLines } from "@/app/components/ui/background-lines";
import {
    IconCoffee,
    IconFileTypeJs,
    IconBrandPython,
    IconBrandCpp,
    IconHome,
    IconClipboardCopy,
    IconFileBroken,
    IconSignature,
    IconTableColumn,
    IconDatabase,
    IconTestPipe,
    IconFileText,
    IconBrandGithub, IconSchool, IconFileCode, IconTemplate
} from "@tabler/icons-react";
import { FloatingDock } from "@/app/components/ui/floating-dock";
import { FloatingNav } from "@/app/components/ui/floating-navbar";
import { Button, Link } from "@nextui-org/react";
import { BentoGrid, BentoGridItem } from "@/app/components/ui/bento-grid";
import { Code, Play } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";

export default function Page() {
    const router = useRouter();

    const handleUseDepedency = (dependencyName: string | number | boolean) => {
        // Navigate to IDE with the dependency parameter
        router.push(`/studenthome/java/ide?dependency=${encodeURIComponent(dependencyName)}`);
    };

    class DependencyCard extends React.Component<{ title: any, description: any, icon: any, color: string }> {
        static defaultProps = {color: "blue"}

        render() {
            let {title, description, icon, color} = this.props;
            return (
                <div
                    className="w-full h-full p-6 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300 bg-white/5 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/20 dark:border-neutral-700/50 backdrop-blur-sm">
                    <div className="flex flex-col gap-4 flex-1">
                        <div className={`flex items-center gap-3 text-${color}-400`}>
                            {icon}
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                        </div>

                        <p className="text-sm text-neutral-300 leading-relaxed flex-1">
                            {description}
                        </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-neutral-700/50">
                        <Button
                            onClick={() => handleUseDepedency(title)}
                            className={`w-full bg-gradient-to-r from-${color}-500 to-${color}-600 hover:from-${color}-600 hover:to-${color}-700 text-white font-medium rounded-lg px-4 py-2.5 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-${color}-500/25`}
                        >
                            <Play className="h-4 w-4"/>
                            Use in IDE
                        </Button>
                    </div>
                </div>
            );
        }
    }

    const links = [
        {
            title: "Home",
            icon: (
                <IconHome className="h-full w-full text-blue-500 dark:text-blue-300" />
            ),
            href: "/studenthome",
        },
        {
            title: "Dashboard",
            icon: (
                <IconCoffee className="h-full w-full text-blue-500 dark:text-blue-300" />
            ),
            href: "/studenthome/java",
        },
        {
            title: "Java IDE",
            icon: (
                <IconFileCode className="h-full w-full text-blue-500 dark:text-blue-300" />
            ),
            href: "/studenthome/java/ide",
        },
        {
            title: "Templates",
            icon: (
                <IconTemplate className="h-full w-full text-blue-500 dark:text-blue-300" />
            ),
            href: "/studenthome/java/templates",
        },
        {
            title: "Classes",
            icon: (
                <IconSchool className="h-full w-full text-blue-500 dark:text-blue-300" />
            ),
            href: "/studenthome/classes",
        },
    ];

    const dependencies = [
        {
            title: "JUnit 5",
            description: "Modern testing framework for Java with powerful annotations, assertions, and test lifecycle management. Perfect for unit testing and test-driven development.",
            icon: <IconTestPipe className="h-6 w-6" />,
            color: "green",
        },
        {
            title: "Jackson",
            description: "High-performance JSON processor for Java. Seamlessly convert between Java objects and JSON with powerful data binding capabilities.",
            icon: <IconFileBroken className="h-6 w-6" />,
            color: "blue",
        },
        {
            title: "Spring Boot",
            description: "Opinionated framework that simplifies Spring application development with auto-configuration, embedded servers, and production-ready features.",
            icon: <IconSignature className="h-6 w-6" />,
            color: "purple",
        },
        {
            title: "Hibernate",
            description: "Object-relational mapping framework that simplifies database interactions using Java objects with powerful caching and query capabilities.",
            icon: <IconDatabase className="h-6 w-6" />,
            color: "orange",
        },
        {
            title: "Apache Commons",
            description: "Comprehensive collection of reusable Java utilities covering collections, file operations, string manipulation, and much more.",
            icon: <IconBrandGithub className="h-6 w-6" />,
            color: "yellow",
        },
        {
            title: "Mockito",
            description: "Elegant mocking framework for unit tests. Create test doubles, verify interactions, and stub method calls with clean, readable syntax.",
            icon: <IconClipboardCopy className="h-6 w-6" />,
            color: "stone",
        },
        {
            title: "Log4j",
            description: "Flexible and configurable logging framework with multiple output destinations, log levels, and performance optimizations for Java applications.",
            icon: <IconFileText className="h-6 w-6" />,
            color: "red",
        },
        {
            title: "Gson",
            description: "Google's JSON library for Java offering simple APIs for JSON serialization and deserialization with support for generics and custom serializers.",
            icon: <IconTableColumn className="h-6 w-6" />,
            color: "pink",
        },
    ];

    const items = dependencies.map((dep, index) => ({
        title: "",
        description: "",
        header: <DependencyCard {...dep} />,
        className: "md:col-span-1",
        icon: null,
    }));

    return (
        <>
            <FloatingNav />
            <div className="min-h-screen w-full bg-black relative flex flex-col items-center antialiased">
                {/* Hero Section */}
                <BackgroundLines className="flex items-center justify-center w-full flex-col px-4 py-20">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
                            <Code className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-blue-300 font-medium">Java Development</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-b from-white via-blue-100 to-blue-400 bg-clip-text text-transparent mb-6">
                            Java Dependencies
                        </h1>

                        <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed mb-8">
                            Discover powerful Java libraries and frameworks to accelerate your development.
                            {/* eslint-disable-next-line react/no-unescaped-entities */}
                            Click "Use in IDE" to start implementing any dependency in your project.
                        </p>

                        <div className="flex items-center justify-center gap-4 text-sm text-neutral-400">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span>Ready to use</span>
                            </div>
                            <div className="w-px h-4 bg-neutral-600"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span>IDE Integration</span>
                            </div>
                        </div>
                        {/* Dependencies Grid */}
                        <div className="flex justify-center mt-12">
                            <div className="flex space-x-4 p-4 bg-neutral-900/80 backdrop-blur-xl rounded-2xl border border-neutral-700/40 shadow-2xl">
                                {links.map((link, index) => (
                                    <div key={index} className="relative group">
                                        <Link
                                            href={link.href}
                                            className="flex items-center justify-center w-14 h-14 bg-neutral-800/70 backdrop-blur-sm hover:bg-neutral-700/90 rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-2 border border-neutral-600/50 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
                                        >
                                            {React.cloneElement(link.icon, {
                                                className: "h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-200"
                                            })}
                                        </Link>

                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900/95 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 pointer-events-none border border-neutral-600/50 shadow-xl">
                                            {link.title}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900/95"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </BackgroundLines>

                {/*Bento Grid*/}
                <div className="w-full max-w-7xl mx-auto px-6 pb-32">
                    <BentoGrid className="md:auto-rows-[280px] gap-6">
                        {items.map((item, i) => (
                            <BentoGridItem
                                key={i}
                                title={item.title}
                                description={item.description}
                                header={item.header}
                                className={`${item.className} bg-transparent border-0 p-0 overflow-hidden`}
                                icon={item.icon}
                            />
                        ))}
                    </BentoGrid>
                </div>
            </div>
        </>
    );
}