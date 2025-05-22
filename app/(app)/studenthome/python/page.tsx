'use client';
import React, { MouseEventHandler } from 'react';
import { BentoGrid, BentoGridItem } from "@/app/components/ui/bento-grid";
import { FloatingDock } from "@/app/components/ui/floating-dock";
import {
    IconCoffee,
    IconBrandTypescript,
    IconFileTypeJs,
    IconBrandPython,
    IconBrandCpp,
    IconTerminal2,
} from "@tabler/icons-react";
import {
    IconClipboardCopy,
    IconFileBroken,
    IconSignature,
    IconTableColumn,
} from "@tabler/icons-react";
import { FloatingNav } from "@/app/components/ui/floating-navbar";
import { use } from "react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@nextui-org/react";
export default function Page() {
    const { data: session } = useSession();
    const [projectList, setProjectList] = useState<string[]>([]);

    useEffect(() => {
        if (session && session.user.role == 'student') {
            const getProjects = async () => {
                const response = await fetch('/api/student/get_projectlist/post', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                setProjectList(Array.isArray(data.java_project_names) ? data.java_project_names : []);
            }
            getProjects();
        }
    }, []);
    const Skeleton = () => (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl   dark:bg-dot-white/[0.2] bg-dot-black/[0.2] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]  border border-transparent dark:border-white/[0.2] bg-neutral-100 dark:bg-black"></div>
    );
    const items = [
        {
            title: "Python IDE",
            description: "Open the IDE and get coding!",
            header: <OpenIDE/>,
            className: "md:col-span-2",
            icon: <IconFileBroken className="h-4 w-4 text-blue-500" />,
        },
        {
            title: "Your Python Projects",
            description: "View all your python projects here",
            header: <PythonProjects/>,
            className: "md:col-span-1",
            icon: <IconBrandPython className="h-4 w-4 text-blue-500" />,
        },
        {
            title: "Notifications",
            description:
                "Keep up to date with project updates",
            header: <p>Updates</p>,
            className: "md:col-span-1",
            icon: <IconTableColumn className="h-4 w-4 text-blue-500" />,
        },
        {
            title: "Classes",
            description: "See assignments, projects, and announcements",
            header: <OpenClassroom/>,
            className: "md:col-span-2",
            icon: <IconClipboardCopy className="h-4 w-4 text-blue-500" />,
        },
    ];
       function PythonProjects() {
        return (
            <div className="my-auto h-full">
                <div className="flex flex-col space-y-1">
                    {projectList?.map((project) => {
                        return (
                            <>
                                {/* <a className="text-black dark:text-white" key={project} href="/">{project}</a> */}
                                <Link className="text-black dark:text-white" href={`/studenthome/java/ide?project=${project}`}>{project}</Link>
                            </>
                        );
                    })}
                </div>
                <button className="dark:hover:bg-green-300 border-2 border-white rounded-md px-4 py-2 mt-1 text-black dark:text-blue-500 bg-neutral-300 dark:bg-black" >Create New Project</button>
            </div>
        );
    }
    function OpenIDE() {
        return (
            <div className="my-auto h-full">
                <div className="flex flex-col space-y-1">
                    {projectList?.map((project) => {
                        return (
                            <>
                                {/* <a className="text-black dark:text-white" key={project} href="/">{project}</a> */}
                                <Link className="text-black dark:text-white" href={`/studenthome/python/ide?project=${project}`}>{project}</Link>
                            </>
                        );
                    })}
                </div>
                <button className="dark:hover:bg-red-300 border-2 border-white rounded-md px-4 py-2 mt-1 text-black dark:text-blue-500 bg-neutral-300 dark:bg-black" >
                    <a href = "/studenthome/python/ide"> Open IDE</a>
                </button>
            </div>
        );
    }
    function OpenClassroom() {
        return (
            <div className="my-auto h-full">
                <div className="flex flex-col space-y-1">
                    {projectList?.map((project) => {
                        return (
                            <>
                                {/* <a className="text-black dark:text-white" key={project} href="/">{project}</a> */}
                                <Link className="text-black dark:text-white" href={`/studenthome/java/ide?project=${project}`}>{project}</Link>
                            </>
                        );
                    })}
                </div>
                <button className="dark:hover:bg-yellow-300 border-2 border-white rounded-md px-4 py-2 mt-1 text-black dark:text-blue-500 bg-neutral-300 dark:bg-black" >Open Classroom</button>
            </div>
        );
    }
    return (
            <>
                <div className = "h-30 mt-40 mb-10 border-black rounded-lg text-center dark:bg-neutral-790 flex-justify-center font-bold text-blue-600">
                    <h1 className = "relative z-10 text-lg md:text-7xl  bg-clip-text bg-gradient-to-b from-neutral-200 to-neutral-600  text-center font-sans font-bold">Python Dashboard</h1>
                </div>
                <FloatingNav />
    
                {/* <BackgroundLines className="flex items-center justify-center w-full flex-col px-4">
                    <h2 className="bg-clip-text text-transparent text-center bg-gradient-to-b from-neutral-900 to-neutral-700 dark:from-neutral-600 dark:to-white text-2xl md:text-4xl lg:text-7xl font-sans py-2 md:py-10 relative z-20 font-bold tracking-tight">
                        Sanjana Airlines, <br /> Sajana Textiles.
                    </h2>
                    <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-700 dark:text-neutral-400 text-center">
                        Get the best advices from our experts, including expert artists,
                        painters, marathon enthusiasts and RDX, totally free.
                    </p>
                </BackgroundLines> */}
    
                <BentoGrid className="max-w-4x1 mx-auto md:auto-rows-[20rem] pb-4">
                    {items.map((item, i) => (
                        <BentoGridItem
                            key={i}
                            title={item.title}
                            description={item.description}
                            header={item.header}
                            className={item.className}
                            icon={item.icon}
                        />
                    ))}
                </BentoGrid>
    
            </>
    
        );
    /*
    return (
        <>
        <div className = "flex justify-center">
            <img src={`${process.env.PUBLIC_URL}/sc_logo.png`} alt="failed pic bro"/>
        </div>
        <button id="thebutton" onClick={async () => { alert('hello')}}>
            Do Something   
        </button>

        <div>
            Nothing to see here
        </div>
        <div className = "flex justify-center">
            <button onclick = "addProject()" className="l-40 w-40 h-40 object-left rounded-lg border-2 border-white bg-green-500 dark:bg-emerald-500 text-neutral-0">
                Make a new project
            </button>
        </div>
        <div className = "flex-justify-center">
            <button>
                <IconBrandPython href='/studenthome/python/ide'></IconBrandPython>
                <a href='/studenthome/python/ide'>Open IDE</a>
            </button>
        </div>
        <div className = "columns-8">

        </div>
        </>
    );
    */
}


