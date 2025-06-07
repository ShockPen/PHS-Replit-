// app/(app)/studenthome/python/ide/layout.tsx
"use client";

import { useEffect } from "react";

export default function PythonIDELoaderLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Check if the script is already present to prevent multiple appends
        if (!document.getElementById('pyodide-script')) {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js"; // Use v0.27.1 for consistency
            script.type = "text/javascript";
            script.async = true;
            script.id = 'pyodide-script'; // Add an ID to easily check for its existence
            // REMOVE console.log("✅ Pyodide loaded"); here, as PyodidePage will handle full init logging
            script.onerror = () => console.error("❌ Failed to load Pyodide script via layout");
            document.body.appendChild(script);
        }
    }, []);

    return <>{children}</>;
}