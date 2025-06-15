"use client"

import { BackgroundLines } from "@/app/components/ui/background-lines"
import {
    IconCoffee,
    IconHome,
    IconClipboardCopy,
    IconFileBroken,
    IconSignature,
    IconTableColumn,
    IconDatabase,
    IconTestPipe,
    IconBrandGithub,
    IconSchool,
    IconFileCode,
    IconTemplate,
} from "@tabler/icons-react"
import { FloatingNav } from "@/app/components/ui/floating-navbar"
import { Button, Link } from "@nextui-org/react"
import { BentoGrid, BentoGridItem } from "@/app/components/ui/bento-grid"
import { Code, Play } from "lucide-react"
import React from "react"
import { useRouter } from "next/navigation"
import { generateTemplateFile, downloadFile } from "@/app/utils/fileGenerator"

export default function Page() {
    const router = useRouter()

    const handleUseTemplate = (templateName: string | number | boolean) => {
        const { filename, content } = generateTemplateFile(String(templateName), "java")
        downloadFile(filename, content)

        // Show success message
        console.log(`Downloaded ${filename} template successfully!`)
    }

    interface TemplateCardProps {
        title: string
        description: string
        icon: React.ReactElement
        color?: string
    }

    const TemplateCard = ({ title, description, icon, color = "blue" }: TemplateCardProps) => {
        return (
            <div className="w-full h-full p-6 flex flex-col justify-between overflow-hidden group-hover:scale-[1.02] transition-all duration-300 bg-white/5 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/20 dark:border-neutral-700/50 backdrop-blur-sm">
                <div className="flex flex-col gap-4 flex-1">
                    <div className={`flex items-center gap-3 text-${color}-400`}>
                        {icon}
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>

                    <p className="text-sm text-neutral-300 leading-relaxed flex-1">{description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-700/50">
                    <Button
                        onClick={() => handleUseTemplate(title)}
                        className={`w-full bg-gradient-to-r from-${color}-500 to-${color}-600 hover:from-${color}-600 hover:to-${color}-700 text-white font-medium rounded-lg px-4 py-2.5 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-${color}-500/25`}
                    >
                        <Play className="h-4 w-4" />
                        Download Template
                    </Button>
                </div>
            </div>
        )
    }

    const links = [
        {
            title: "Home",
            icon: <IconHome className="h-full w-full text-blue-500 dark:text-blue-300" />,
            href: "/educatorhome",
        },
        {
            title: "Dashboard",
            icon: <IconCoffee className="h-full w-full text-blue-500 dark:text-blue-300" />,
            href: "/educatorhome/java",
        },
        {
            title: "Java IDE",
            icon: <IconFileCode className="h-full w-full text-blue-500 dark:text-blue-300" />,
            href: "/educatorhome/java/ide",
        },
        {
            title: "Templates",
            icon: <IconTemplate className="h-full w-full text-blue-500 dark:text-blue-300" />,
            href: "/educatorhome/java/templates",
        },
        {
            title: "Classes",
            icon: <IconSchool className="h-full w-full text-blue-500 dark:text-blue-300" />,
            href: "/educatorhome/classes",
        },
    ]

    const templates = [
        {
            title: "Spring Boot Web App",
            description:
                "Complete Spring Boot web application template with REST controllers, service layers, and web interface. Includes auto-configuration and embedded server.",
            icon: <IconSignature className="h-6 w-6" />,
            color: "green",
        },
        {
            title: "Console Application",
            description:
                "Interactive console application template with command processing, user input handling, and data management. Perfect for CLI tools and utilities.",
            icon: <IconFileCode className="h-6 w-6" />,
            color: "blue",
        },
        {
            title: "REST API Service",
            description:
                "RESTful web service template with CRUD operations, JSON handling, and proper HTTP status codes. Includes error handling and validation.",
            icon: <IconDatabase className="h-6 w-6" />,
            color: "purple",
        },
        {
            title: "Unit Testing Suite",
            description:
                "Comprehensive JUnit 5 testing template with test fixtures, parameterized tests, and mocking. Includes best practices for test organization.",
            icon: <IconTestPipe className="h-6 w-6" />,
            color: "orange",
        },
        {
            title: "Data Processing App",
            description:
                "Template for data processing applications with file I/O, CSV handling, and data transformation utilities. Includes error handling and logging.",
            icon: <IconTableColumn className="h-6 w-6" />,
            color: "red",
        },
        {
            title: "Microservice Template",
            description:
                "Spring Boot microservice template with health checks, metrics, configuration management, and Docker support for cloud deployment.",
            icon: <IconBrandGithub className="h-6 w-6" />,
            color: "yellow",
        },
        {
            title: "Desktop GUI App",
            description:
                "JavaFX desktop application template with modern UI components, event handling, and MVC architecture. Includes styling and layout examples.",
            icon: <IconFileBroken className="h-6 w-6" />,
            color: "cyan",
        },
        {
            title: "Batch Processing",
            description:
                "Spring Batch template for large-scale data processing with job configuration, step processing, and error handling for enterprise applications.",
            icon: <IconClipboardCopy className="h-6 w-6" />,
            color: "pink",
        },
    ]

    const items = templates.map((template, index) => ({
        title: "",
        description: "",
        header: <TemplateCard {...template} />,
        className: "md:col-span-1",
        icon: null,
    }))

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
                            Java Templates
                        </h1>

                        <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed mb-8">
                            Jumpstart your Java projects with professional templates and boilerplates. Click &quot;Download Template&quot; to
                            get the template code and load it into your IDE.
                        </p>

                        <div className="flex items-center justify-center gap-4 text-sm text-neutral-400">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span>Production Ready</span>
                            </div>
                            <div className="w-px h-4 bg-neutral-600"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span>Best Practices</span>
                            </div>
                        </div>
                        {/* Templates Grid */}
                        <div className="flex justify-center mt-12">
                            <div className="flex space-x-4 p-4 bg-neutral-900/80 backdrop-blur-xl rounded-2xl border border-neutral-700/40 shadow-2xl">
                                {links.map((link, index) => (
                                    <div key={index} className="relative group">
                                        <Link
                                            href={link.href}
                                            className="flex items-center justify-center w-14 h-14 bg-neutral-800/70 backdrop-blur-sm hover:bg-neutral-700/90 rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-2 border border-neutral-600/50 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
                                        >
                                            {React.cloneElement(link.icon, {
                                                className: "h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-200",
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
    )
}
