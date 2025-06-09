"use client";

import { BentoGrid, BentoGridItem } from "@/app/components/ui/bento-grid";
import { BackgroundLines } from "@/app/components/ui/background-lines";
import {
    IconCoffee,
    IconBrandTypescript,
    IconFileTypeJs,
    IconBrandPython,
    IconBrandCpp,
    IconTerminal2,
} from "@tabler/icons-react";
import { FloatingDock } from "@/app/components/ui/floating-dock";
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


/*
    if (session?.user.role !== 'educator') {
        return (
            <>
                <div className="min-h-screen flex justify-center items-center bg-white dark:bg-black">
                    <h1 className="text-4xl font-bold text-black dark:text-white">You do not have permission to view this page.</h1>
                </div>
            </>
        );
    }
*/
    const links = [
        {
            title: "Java",
            icon: (
                <IconCoffee className="h-full w-full text-neutral-500 dark:text-red-300" />
            ),
            href: "/educatorhome/java",
        },
        {
            title: "Node.js",
            icon: (
                <IconFileTypeJs className="h-full w-full text-neutral-500 dark:text-red-300" />
            ),
            href: "/educatorhome/linux",
        },

        {
            title: "Python",
            icon: (
                <IconBrandPython className="h-full w-full text-neutral-500 dark:text-red-300" />
            ),
            href: "/educatorhome/python",
        },
        {
            title: "C++",
            icon: (
                <IconBrandCpp className="h-full w-full text-neutral-500 dark:text-red-300" />
            ),
            href: "/educatorhome/cpp",
        },
        {
            title: "Linux Terminal",
            icon: (
                <IconTerminal2 className="h-full w-full text-neutral-500 dark:text-red-300" />
            ),
            href: "/educatorhome/linux",
        },
    ];

    const Skeleton = () => (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl   dark:bg-dot-white/[0.2] bg-dot-black/[0.2] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]  border border-transparent dark:border-white/[0.2] bg-neutral-100 dark:bg-black"></div>
    );

    function Classrooms() {
        return (
            <div className="my-auto h-full">
                <div className="flex flex-col space-y-1">
                    {projectList?.map((project) => {
                        return (
                            <>
                                {/* <a className="text-black dark:text-white" key={project} href="/">{project}</a> */}
                                <Link className="text-black dark:text-white" href={`/educatorhome/java/ide?project=${project}`}>{project}</Link>
                            </>
                        );
                    })}
                </div>
                <div>Your classrooms</div>
            </div>
        );
    }

    function GenerateClubMeetingQRCode() {
        return (
            <div className="my-auto h-full">
                <div className="flex flex-col space-y-1">
                    <Link href="/educatorhome/generateclubqrcode">
                        <button
                            className="border rounded-md px-4 py-2 mt-1 text-black dark:text-white bg-neutral-300 dark:bg-red-800"
                        >
                            Generate Club Meeting Attendance QR Code
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    const items = [
        {
            title: "Your Classrooms",
            description: "Open a new world of computer science for your students",
            header: <Classrooms />,
            className: "md:row-span-1 md:col-span-2",
            icon: <IconClipboardCopy className="h-4 w-4 text-neutral-500" />,
        },
        
    ];


    return (
        <>
           <FloatingNav />
            <div className="h-screen w-full rounded-md bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
                <BackgroundLines className="flex items-center justify-center w-full flex-col px-4">

                    <div className="max-w-2xl mx-auto p-4">
                        <h1 className="relative z-10 text-lg md:text-7xl  bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600  text-center font-sans font-bold">
                            Welcome to your teacher dashboard
                        </h1>
                        <p></p>
                        <p className="text-neutral-500 max-w-lg mx-auto my-2 text-sm text-center relative z-10">
                            SchoolNest provides you with a suite of development tools to help you supercharge your student&apos;s learning in computer science.
                        </p>

                    </div>
                </BackgroundLines>

                {/* <BackgroundBeams /> */}
                {/* <Boxes /> */}
            </div>

            {/* <BackgroundLines className="flex items-center justify-center w-full flex-col px-4">
                <h2 className="bg-clip-text text-transparent text-center bg-gradient-to-b from-neutral-900 to-neutral-700 dark:from-neutral-600 dark:to-white text-2xl md:text-4xl lg:text-7xl font-sans py-2 md:py-10 relative z-20 font-bold tracking-tight">
                    Sanjana Airlines, <br /> Sajana Textiles.
                </h2>
                <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-700 dark:text-neutral-400 text-center">
                    Get the best advices from our experts, including expert artists,
                    painters, marathon enthusiasts and RDX, totally free.
                </p>
            </BackgroundLines> */}

            <div className="absolute top-3/4 flex items-center justify-center w-full">
                <FloatingDock
                    mobileClassName="translate-y-40" // only for demo, remove for production
                    items={links}
                />
            </div>
            <div title = "Classrooms" className = "max-w-4xl mx-auto md:auto-rows-[20rem] pb-4">
            <BentoGrid className="max-w-4xl mx-auto md:auto-rows-[20rem] pb-4">
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
            </div>
        </>

    );

}




