'use client';
import { loadPyodide } from 'pyodide';
import { Sidebar, SidebarBody, SidebarLink } from "@/app/components/ui/sidebar";
import React, { MouseEventHandler, useEffect, useRef, useState } from 'react';
import {
    IconArrowLeft,
    IconBrandTabler,
    IconSettings,
    IconUserBolt,
    IconCoffee,
    IconPackage,
    IconTemplate,
    IconBrandTypescript,
    IconFileTypeJs,
    IconBrandPython,
    IconBrandCpp,
    IconTerminal2,
    IconFolderDown,
    IconLoader,
    IconFileDownload,
    IconUpload,
    IconPlayerPlayFilled,
    IconCloudUpload,
    IconBrandGithub,
} from "@tabler/icons-react";
import {
    IconClipboardCopy,
    IconFileBroken,
    IconSignature,
    IconTableColumn,
} from "@tabler/icons-react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import { useSession } from "next-auth/react";
import Script from 'next/script';
import { useSearchParams } from "next/navigation";
import {Code, Edit3, Play, Trash2} from "lucide-react";

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface File {
  filename: string;
  contents: string;
}

interface Project {
  project_name: string,
  files: File[]
}

export default function Page() {
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [inputPrompt, setInputPrompt] = useState('');
    const [currentInput, setCurrentInput] = useState('');
    const [inputResolver, setInputResolver] = useState<((value: string) => void) | null>(null);
    const [code, setCode] = useState('');
    const [pyodide, setPyodide] = useState<any>(null);
    const [result, setResult] = useState<string[]>([]);
    const [userInput, setUserInput] = useState('');
    const [activeFile, setActiveFile] = useState('Main.py');
    const inputFieldRef = useRef<HTMLInputElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const isResizing = useRef(false);
    const searchParams = useSearchParams();
    const projectFromUrl = searchParams.get("project") ?? "";
    const [project, setProject] = useState(projectFromUrl);
    const [projectList, setProjectList] = useState<string[]>([]);
    const [signedIn, setSignedIn] = useState(false);
    const [name, setName] = useState('');
    const { data: session } = useSession();
    const [files, setFiles] = useState<File[]>([
        {
          filename: 'Main.py',
          contents: `import java.util.Scanner;
    
    public class Main {
        public static void main(String args[]) {
            Scanner scan = new Scanner(System.in);
            System.out.println("Enter an integer");
            int a = scan.nextInt();
            System.out.println("Your integer: " + a);
        }
    }
    `,
        },]);

        interface File {
  filename: string;
  contents: string;
}

interface Project {
  project_name: string,
  files: File[]
}
useEffect(() => {
if (session && (session.user.role == 'student' || session.user.role == 'educator')) {
      setSignedIn(true);
useEffect(() => {
  (window as any).setIsWaitingForInput = setIsWaitingForInput;
(window as any).setInputPrompt = setInputPrompt;
}, []);

const getStudentInfo = async () => {
        const response = await fetch('/api/student/get_studentinfo/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
      }
      getStudentInfo();
/*
      const getProjectFiles = async () => {
        const response = await fetch('/api/student/get_files/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ project_name: project })
        });

        const data = await response.json();

        if (data.project) {
          setFiles(data.project.files);
        } else {
          alert('Project not found');
        }

      }

      getProjectFiles();
*/
      const getProjects = async () => {
        const response = await fetch('/api/student/get_projectlist/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        setProjectList(data.java_project_names);
      }
      getProjects();
    }
    const saveProject = async () => {
        try {
          const response = await fetch('/api/student/save_files/post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ project, files })
          });
    
        } catch (errors: any) {
          console.log(errors);
        }
      }
    
      const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
    
        reader.onload = (e) => {
          const contents = e.target?.result as string;
          const newFile = {
            filename: file.name,
            contents,
          };
          setFiles((prev) => [...prev, newFile]);
    
          
          setActiveFile(file.name);
        };
    
        reader.readAsText(file);
      }
  }, []);
    useEffect(() => {
        const loadPyodideRuntime = async () => {
            const pyodideInstance = await (window as any).loadPyodide();
            await pyodideInstance.loadPackage("numpy");
            setPyodide(pyodideInstance);
            /*
            pyodideInstance.globals.set("js_get_input", pyodideInstance.runPython(`
      import js
      async def input(prompt=""):
          print(prompt, end="")
          return await js.handleInputSubmit()
    `));*/

        };
        
        if ((window as any).loadPyodide) {
            loadPyodideRuntime();
        }
    }, []);

    const runPython = async () => {
  if (!pyodide) return;
  
  try {
    setResult([]);

    (window as any).updateOutput = (text: string) => {
      setResult(prev => [...prev, text]);
    };
    (window as any).handleInputSubmit = (): Promise<string> => {
            return new Promise<string>((resolve) => {
                setInputResolver(() => (value: string) => resolve(value));
                setIsWaitingForInput(true);
            });
        };
    (window as any).setIsWaitingForInput = setIsWaitingForInput;
    (window as any).setInputPrompt = setInputPrompt;
    (window as any).setInputResolver = setInputResolver;
    pyodide.runPython(`
import sys
import builtins
import js
import ast
import asyncio

class CustomStdout:
    def __init__(self):
        pass
   
    def write(self, text):
        from js import window
        window.updateOutput(text)
        return len(text)
   
    def flush(self):
        pass


sys.stdout = CustomStdout()


async def async_input(prompt=""):
    print(prompt, end="")
    result = await js.handleInputSubmit()
    return str(result)


class AsyncInputNamespace:
    def __init__(self):
        self.original_input = builtins.input
    
    def input(self, prompt=""):
        # This will be called when user writes input()
        # We return the coroutine that will be awaited by our exec wrapper
        return async_input(prompt)


async_ns = AsyncInputNamespace()


async def execute_with_async_input(code_str):
    # Parse the code into an AST
    try:
        tree = ast.parse(code_str)
    except SyntaxError as e:
        print(f"Syntax Error: {e}")
        return
    
    
    class InputTransformer(ast.NodeTransformer):
        def visit_Call(self, node):
            # Check if this is a call to input()
            if (isinstance(node.func, ast.Name) and 
                node.func.id == 'input'):
                # Wrap in await
                return ast.Await(value=node)
            return self.generic_visit(node)
    
    
    transformer = InputTransformer()
    new_tree = transformer.visit(tree)
    ast.fix_missing_locations(new_tree)
    
    
    async_func = ast.AsyncFunctionDef(
        name='main',
        args=ast.arguments(
            posonlyargs=[],
            args=[],
            vararg=None,
            kwonlyargs=[],
            kw_defaults=[],
            kwarg=None,
            defaults=[]
        ),
        body=new_tree.body,
        decorator_list=[],
        returns=None
    )
    
    
    module = ast.Module(body=[async_func], type_ignores=[])
    ast.fix_missing_locations(module)
    
    
    code_obj = compile(module, '<string>', 'exec')
    namespace = {'input': async_input, 'print': print, '__builtins__': builtins}
    exec(code_obj, namespace)
    
    
    await namespace['main']()


builtins.execute_with_async_input = execute_with_async_input
`);
   
        
        const wrappedCode = `
await execute_with_async_input('''${code.replace(/'/g, "\\'")}''')
`;
        
        await pyodide.runPythonAsync(wrappedCode);
   
    } catch (error) {
        setResult(prev => [...prev, '\nError: ' + String(error)]);
    }
};


const handleInputSubmit = () => {
    if (isWaitingForInput) {
        // Echo the input to the output
        setResult(prev => [...prev, userInput + '\n']);
        
        // Set the global variables for Python to read
        (window as any).inputResult = String(userInput);
        (window as any).inputReady = true;
       
        // Reset state
        setUserInput('');
        setIsWaitingForInput(false);
    }
  /* if (inputResolver && isWaitingForInput) {
    setResult(prev => [...prev, userInput + '\n']);
    inputResolver(String(userInput));
    
    setUserInput('');
    setIsWaitingForInput(false);
    setInputResolver(null);
    setInputPrompt('');
  }
    */
};

const getInput = async() => {
  if (inputResolver && isWaitingForInput) {
    setResult(prev => [...prev, userInput + '\n']);
    let pastInput =  userInput;
    inputResolver(userInput);
    
    setUserInput('');
    setIsWaitingForInput(false);
    setInputResolver(null);
    setInputPrompt('');
    return (pastInput);
  }
}

  
const Logo = () => {
    return (
        <Link
            href="/"
            className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20"
        >
          <div className="h-6 w-6 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-lg shadow-lg shadow-orange-500/30 flex-shrink-0" />
          <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-semibold text-white whitespace-pre bg-gradient-to-r from-orange-400 to-white bg-clip-text text-transparent"
          >
            SchoolNest
          </motion.span>
        </Link>
    );
  };

  const LogoIcon = () => {
    return (
        <Link
            href="#"
            className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20"
        >
          <div className="h-6 w-6 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-lg shadow-lg shadow-orange-500/30 flex-shrink-0" />
        </Link>
    );
  };

const links = [
    {
      label: "Home",
      href: "/studenthome/",
      icon: (
          <IconBrandTabler className="text-orange-400 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Profile",
      href: "#",
      icon: (
          <IconUserBolt className="text-orange-400 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Dashboard",
      href: "/studenthome/java",
      icon: (
          <IconCoffee className="text-orange-400 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Dependencies",
      href: "/studenthome/java/dependencies",
      icon: (
          <IconPackage className="text-orange-400 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Templates",
      href: "/studenthome/java/templates",
      icon: (
          <IconTemplate className="text-orange-400 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Account Settings",
      href: "#",
      icon: (
          <IconSettings className="text-orange-400 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Logout",
      href: "",
      icon: (
          <IconArrowLeft className="text-orange-400 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];
    return (
      <>
      
  <div className="flex h-screen"> 
    <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10 bg-slate-900">
                  <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden ml-1 mb-2 pb-6">
                    {open ? <Logo /> : <LogoIcon />}
      
                    <div className="mt-8 flex flex-col gap-2">
                      {links.map((link, idx) => (
                          <SidebarLink key={idx} link={link} />
                      ))}
                    </div>
                  </div>
                  <div>
                    {signedIn ?
                        <SidebarLink
                            link={{
                              label: name,
                              href: "#",
                              icon: (
                                  <Image
                                      src="/sc_logo.png"
                                      className="h-7 w-7 flex-shrink-0 rounded-full border border-blue-400"
                                      width={50}
                                      height={50}
                                      alt="Avatar"
                                  />
                              ),
                            }} />
                        :
                        null
                    }
                  </div>
                </SidebarBody>
              </Sidebar>
    <Script src="https://cdn.jsdelivr.net/pyodide/v0.27.1/full/pyodide.js" strategy="beforeInteractive" />
    {/* Actions Section */}
            <div className="space-y-4 flex-shrink-0">
              <div className="flex  items-center space-x-2 mb-4">
                <Play className="h-4 w-4 text-blue-500" />
                <h3 className="text-neutral-900 dark:text-white text-sm font-semibold">Actions</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                    className="rounded-lg py-3 px-4 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 font-medium transition-all duration-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                    
                >
                  <IconFileDownload className="w-4 h-4" />
                  <span className="text-sm">Add File</span>
                </button>

                <button
                    className="rounded-lg py-3 px-4 bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 text-green-700 dark:text-green-300 font-medium transition-all duration-200 border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                    onClick={runPython}
                >
                  <IconPlayerPlayFilled className="w-4 h-4" />
                  <span className="text-sm">Run File</span>
                </button>

                <button
                    className="rounded-lg py-3 px-4 bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-300 font-medium transition-all duration-200 border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                    
                >
                  <IconFolderDown className="w-4 h-4" />
                  <span className="text-sm">Export</span>
                </button>

                <button
                    className="rounded-lg py-3 px-4 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-300 font-medium transition-all duration-200 border border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 active:scale-[0.98]"
                    
                >
                  <IconCloudUpload className="w-4 h-4" />
                  <span className="text-sm">Save</span>
                </button>

                <label className="rounded-lg py-3 px-4 bg-orange-100 dark:bg-orange-800 hover:bg-orange-200 dark:hover:bg-orange-700 text-orange-700 dark:text-orange-300 font-medium cursor-pointer transition-all duration-200 border border-orange-200 dark:border-orange-700 hover:border-orange-300 dark:hover:border-orange-600 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-[0.98]">
                  <IconUpload className="w-4 h-4" />
                  <span className="text-sm">Load</span>
                  <input
                      type="file"
                      accept=".py"
                      
                      className="hidden"
                  />
                </label>
                </div>
                </div>
    <div id="ed" className="flex-1 flex-col h-screen">
      <MonacoEditor
        height="60%"
        language="python"
        theme="vs-dark"
        value={code}
        onChange={(value) => setCode(value || '')}
        options={{ automaticLayout: true }}
      />
      <div className="bg-black text-white p-4 font-mono h-40 overflow-y-auto border-t border-gray-700">
        <div style={{ display: 'flex' }}>
            <pre className="whitespace-pre-wrap">{'>'} {result}</pre>
            <input
  type="text"
  ref={inputFieldRef}
  disabled={!isWaitingForInput}
  value={userInput}
  onChange={(e) => setUserInput(e.target.value)}
  onKeyPress={(e) => {
    if (e.key === 'Enter' && isWaitingForInput) {
      handleInputSubmit();
    }
  }}
  placeholder={isWaitingForInput ? "Enter your input..." : ""}
  style={{
    width: '100%',
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    outline: 'none',
    fontFamily: 'monospace',
    opacity: isWaitingForInput ? 1 : 0.5,
  }}
/>
          </div>
      </div>
    </div>
  </div>
  </>
);
}
