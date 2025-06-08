"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { BackgroundLines } from "@/app/components/ui/background-lines"
import { FloatingNav } from "@/app/components/ui/floating-navbar"
import { Button } from "@nextui-org/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Badge } from "@/app/components/ui/badge"
import Textarea from "@/app/components/ui/textarea"
import { Input } from "@/app/components/ui/input"
import { ScrollArea } from "@/app/components/ui/scroll-area"
import {
    IconBug,
    IconFileUpload,
    IconPlayerPlay,
    IconPlayerStop,
    IconStepInto,
    IconCornerRightDownDouble,
    IconRefresh,
    IconAlertTriangle,
    IconCircleDashedCheck,
    IconCircleOff,
    IconInfoCircle,
    IconCircle,
    IconCircleFilled,
    IconTerminal,
    IconVariable,
} from "@tabler/icons-react"

interface DebugError {
    line: number
    type: "error" | "warning" | "info"
    message: string
    suggestion?: string
}

interface Variable {
    name: string
    value: any
    type: string
    scope: string
}

interface StackFrame {
    function: string
    line: number
    variables: Variable[]
}

interface DebugState {
    isRunning: boolean
    isPaused: boolean
    currentLine: number
    breakpoints: Set<number>
    variables: Variable[]
    callStack: StackFrame[]
    output: string[]
    errors: DebugError[]
}

interface DefaultCodeMap {
    [key: string]: string
}

const defaultCode: DefaultCodeMap = {
    java: `public class DebugExample {
    public static void main(String[] args) {
        int a = 5;
        int b = 10;
        int sum = add(a, b);
        System.out.println("Sum: " + sum);
        
        int[] numbers = {1, 2, 3, 4, 5};
        int total = 0;
        for (int i = 0; i < numbers.length; i++) {
            total += numbers[i];
        }
        System.out.println("Total: " + total);
    }
    
    public static int add(int x, int y) {
        int result = x + y;
        return result;
    }
}`,
    python: `def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

def main():
    numbers = [1, 2, 3, 4, 5]
    total = 0
    
    for num in numbers:
        total += num
        print(f"Current number: {num}, Total so far: {total}")
    
    print(f"Final total: {total}")
    
    # Calculate fibonacci
    fib_num = 6
    result = fibonacci(fib_num)
    print(f"Fibonacci of {fib_num} is {result}")

if __name__ == "__main__":
    main()`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    vector<int> numbers = {1, 2, 3, 4, 5};
    int sum = 0;
    
    cout << "Processing numbers:" << endl;
    for (int i = 0; i < numbers.size(); i++) {
        sum += numbers[i];
        cout << "Added " << numbers[i] << ", sum is now " << sum << endl;
    }
    
    int fact_input = 5;
    int fact_result = factorial(fact_input);
    cout << "Factorial of " << fact_input << " is " << fact_result << endl;
    
    return 0;
}`,
}

export default function DebuggerPage() {
    const [activeLanguage, setActiveLanguage] = useState("java")
    const [code, setCode] = useState("")
    const [debugState, setDebugState] = useState<DebugState>({
        isRunning: false,
        isPaused: false,
        currentLine: 0,
        breakpoints: new Set(),
        variables: [],
        callStack: [],
        output: [],
        errors: [],
    })
    const [executionSpeed, setExecutionSpeed] = useState(1000)
    const [autoRun, setAutoRun] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Language-specific parsers and executors
    const parseAndExecute = useCallback((code: string, language: string, currentLine: number) => {
        const lines = code
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)

        if (currentLine >= lines.length) {
            return { finished: true, variables: [], output: [], callStack: [] }
        }

        const line = lines[currentLine]
        const variables: Variable[] = []
        const output: string[] = []
        const callStack: StackFrame[] = []

        switch (language) {
            case "java":
                return executeJavaLine(line, currentLine, variables, output, callStack)
            case "python":
                return executePythonLine(line, currentLine, variables, output, callStack)
            case "cpp":
                return executeCppLine(line, currentLine, variables, output, callStack)
            default:
                return { finished: true, variables: [], output: [], callStack: [] }
        }
    }, [])

    const executeJavaLine = (
        line: string,
        lineNum: number,
        variables: Variable[],
        output: string[],
        callStack: StackFrame[],
    ) => {
        // Simulate Java execution
        if (line.includes("int ") && line.includes("=")) {
            const match = line.match(/int\s+(\w+)\s*=\s*(.+);/)
            if (match) {
                const [, varName, value] = match
                let evalValue = value.trim()

                // Handle simple arithmetic
                if (evalValue.includes("+")) {
                    const parts = evalValue.split("+").map((p) => p.trim())
                    evalValue = String(Number.parseInt(parts[0]) + Number.parseInt(parts[1]))
                }

                variables.push({
                    name: varName,
                    value: Number.parseInt(evalValue) || 0,
                    type: "int",
                    scope: "main",
                })
            }
        } else if (line.includes("System.out.println")) {
            const match = line.match(/System\.out\.println$$"(.+)"\s*\+?\s*(.*)?$$/)
            if (match) {
                const [, text, variable] = match
                let outputText = text
                if (variable) {
                    outputText += variable.trim()
                }
                output.push(outputText)
            }
        } else if (line.includes("for")) {
            variables.push({
                name: "i",
                value: 0,
                type: "int",
                scope: "for-loop",
            })
        }

        callStack.push({
            function: line.includes("main") ? "main" : "unknown",
            line: lineNum + 1,
            variables,
        })

        return { finished: false, variables, output, callStack }
    }

    const executePythonLine = (
        line: string,
        lineNum: number,
        variables: Variable[],
        output: string[],
        callStack: StackFrame[],
    ) => {
        // Simulate Python execution
        if (line.includes("=") && !line.includes("==") && !line.includes("def")) {
            const match = line.match(/(\w+)\s*=\s*(.+)/)
            if (match) {
                const [, varName, value] = match
                let evalValue: any = value.trim()

                if (evalValue.startsWith("[") && evalValue.endsWith("]")) {
                    // List
                    evalValue = evalValue
                        .slice(1, -1)
                        .split(",")
                        .map((v:any) => Number.parseInt(v.trim()) || v.trim())
                    variables.push({
                        name: varName,
                        value: evalValue,
                        type: "list",
                        scope: "main",
                    })
                } else if (!isNaN(Number.parseInt(evalValue))) {
                    // Number
                    variables.push({
                        name: varName,
                        value: Number.parseInt(evalValue),
                        type: "int",
                        scope: "main",
                    })
                } else {
                    // String or other
                    variables.push({
                        name: varName,
                        value: evalValue,
                        type: "str",
                        scope: "main",
                    })
                }
            }
        } else if (line.includes("print(")) {
            const match = line.match(/print$$(.+)$$/)
            if (match) {
                let content = match[1]
                if (content.startsWith('f"') || content.startsWith("f'")) {
                    // f-string
                    content = content.slice(2, -1)
                    output.push(content)
                } else if (content.startsWith('"') || content.startsWith("'")) {
                    // Regular string
                    content = content.slice(1, -1)
                    output.push(content)
                } else {
                    output.push(content)
                }
            }
        } else if (line.includes("for ")) {
            const match = line.match(/for\s+(\w+)\s+in/)
            if (match) {
                variables.push({
                    name: match[1],
                    value: "iterator",
                    type: "iterator",
                    scope: "for-loop",
                })
            }
        }

        callStack.push({
            function: line.includes("def ") ? line.split("def ")[1].split("(")[0] : "main",
            line: lineNum + 1,
            variables,
        })

        return { finished: false, variables, output, callStack }
    }

    const executeCppLine = (
        line: string,
        lineNum: number,
        variables: Variable[],
        output: string[],
        callStack: StackFrame[],
    ) => {
        // Simulate C++ execution
        if (line.includes("int ") && line.includes("=")) {
            const match = line.match(/int\s+(\w+)\s*=\s*(.+);/)
            if (match) {
                const [, varName, value] = match
                let evalValue = value.trim()

                if (evalValue.includes("+")) {
                    const parts = evalValue.split("+").map((p) => p.trim())
                    evalValue = String(Number.parseInt(parts[0]) + Number.parseInt(parts[1]))
                }

                variables.push({
                    name: varName,
                    value: Number.parseInt(evalValue) || 0,
                    type: "int",
                    scope: "main",
                })
            }
        } else if (line.includes("vector<int>")) {
            const match = line.match(/vector<int>\s+(\w+)\s*=\s*\{(.+)\}/)
            if (match) {
                const [, varName, values] = match
                const arrayValues = values.split(",").map((v) => Number.parseInt(v.trim()))
                variables.push({
                    name: varName,
                    value: arrayValues,
                    type: "vector<int>",
                    scope: "main",
                })
            }
        } else if (line.includes("cout")) {
            const match = line.match(/cout\s*<<\s*"(.+)"/)
            if (match) {
                output.push(match[1])
            }
        } else if (line.includes("for")) {
            variables.push({
                name: "i",
                value: 0,
                type: "int",
                scope: "for-loop",
            })
        }

        callStack.push({
            function: line.includes("main") ? "main" : "unknown",
            line: lineNum + 1,
            variables,
        })

        return { finished: false, variables, output, callStack }
    }

    const analyzeCode = useCallback((code: string, language: string): DebugError[] => {
        const errors: DebugError[] = []
        const lines = code.split("\n")

        lines.forEach((line, index) => {
            const lineNumber = index + 1

            // Check for division by zero
            if (line.includes("/ 0") || line.includes("/0")) {
                errors.push({
                    line: lineNumber,
                    type: "error",
                    message: "Division by zero detected",
                    suggestion: "Check if the divisor is not zero before performing division",
                })
            }

            // Language-specific checks
            if (language === "java") {
                if (line.includes("int ") && !line.includes("=") && !line.includes("(")) {
                    errors.push({
                        line: lineNumber,
                        type: "warning",
                        message: "Variable declared but not initialized",
                        suggestion: "Initialize the variable with a default value",
                    })
                }
                if (
                    (line.includes("System.out") || line.includes("int ")) &&
                    !line.includes(";") &&
                    !line.includes("{") &&
                    !line.includes("}")
                ) {
                    errors.push({
                        line: lineNumber,
                        type: "error",
                        message: "Missing semicolon",
                        suggestion: "Add a semicolon at the end of the statement",
                    })
                }
            }

            if (language === "python") {
                if (line.trim().startsWith("def ") && lines[index + 1] && !lines[index + 1].startsWith("    ")) {
                    errors.push({
                        line: lineNumber + 1,
                        type: "error",
                        message: "Indentation error",
                        suggestion: "Python requires proper indentation for code blocks",
                    })
                }
            }

            if (language === "cpp") {
                if (
                    (line.includes("cout") || line.includes("int ")) &&
                    !line.includes(";") &&
                    !line.includes("{") &&
                    !line.includes("}")
                ) {
                    errors.push({
                        line: lineNumber,
                        type: "error",
                        message: "Missing semicolon",
                        suggestion: "Add a semicolon at the end of the statement",
                    })
                }
            }
        })

        return errors
    }, [])

    const toggleBreakpoint = (lineNumber: number) => {
        setDebugState((prev) => {
            const newBreakpoints = new Set(prev.breakpoints)
            if (newBreakpoints.has(lineNumber)) {
                newBreakpoints.delete(lineNumber)
            } else {
                newBreakpoints.add(lineNumber)
            }
            return { ...prev, breakpoints: newBreakpoints }
        })
    }

    const startDebugging = () => {
        const errors = analyzeCode(code || defaultCode[activeLanguage], activeLanguage)
        setDebugState((prev) => ({
            ...prev,
            isRunning: true,
            isPaused: false,
            currentLine: 0,
            errors,
            output: [],
            variables: [],
            callStack: [],
        }))

        if (autoRun) {
            executeNextStep()
        }
    }

    const stopDebugging = () => {
        if (executionTimeoutRef.current) {
            clearTimeout(executionTimeoutRef.current)
        }
        setDebugState((prev) => ({
            ...prev,
            isRunning: false,
            isPaused: false,
            currentLine: 0,
        }))
    }

    const executeNextStep = useCallback(() => {
        setDebugState((prev) => {
            if (!prev.isRunning) return prev

            const currentCode = code || defaultCode[activeLanguage]
            const result = parseAndExecute(currentCode, activeLanguage, prev.currentLine)

            if (result.finished) {
                return {
                    ...prev,
                    isRunning: false,
                    isPaused: false,
                    currentLine: 0,
                }
            }

            const newLine = prev.currentLine + 1
            const shouldPause = prev.breakpoints.has(newLine)

            // Accumulate variables and output
            const newVariables = [...prev.variables]
            result.variables.forEach((newVar) => {
                const existingIndex = newVariables.findIndex((v) => v.name === newVar.name && v.scope === newVar.scope)
                if (existingIndex >= 0) {
                    newVariables[existingIndex] = newVar
                } else {
                    newVariables.push(newVar)
                }
            })

            const newState = {
                ...prev,
                currentLine: newLine,
                variables: newVariables,
                output: [...prev.output, ...result.output],
                callStack: result.callStack,
                isPaused: shouldPause,
            }

            // Continue execution if auto-running and not paused
            if (autoRun && !shouldPause && prev.isRunning) {
                executionTimeoutRef.current = setTimeout(() => {
                    executeNextStep()
                }, executionSpeed)
            }

            return newState
        })
    }, [code, activeLanguage, parseAndExecute, autoRun, executionSpeed])

    const stepOver = () => {
        if (debugState.isRunning) {
            executeNextStep()
        }
    }

    const stepInto = () => {
        if (debugState.isRunning) {
            executeNextStep()
        }
    }

    const continueExecution = () => {
        setDebugState((prev) => ({ ...prev, isPaused: false }))
        if (autoRun) {
            executeNextStep()
        }
    }

    const resetDebugger = () => {
        if (executionTimeoutRef.current) {
            clearTimeout(executionTimeoutRef.current)
        }
        setCode(defaultCode[activeLanguage] || "")
        setDebugState({
            isRunning: false,
            isPaused: false,
            currentLine: 0,
            breakpoints: new Set(),
            variables: [],
            callStack: [],
            output: [],
            errors: [],
        })
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            setCode(content)

            const extension = file.name.split(".").pop()?.toLowerCase()
            if (extension === "java") setActiveLanguage("java")
            else if (extension === "py") setActiveLanguage("python")
            else if (extension === "cpp" || extension === "c") setActiveLanguage("cpp")
        }
        reader.readAsText(file)
    }

    const getErrorIcon = (type: string) => {
        switch (type) {
            case "error":
                return <IconCircleOff className="h-4 w-4 text-red-500" />
            case "warning":
                return <IconAlertTriangle className="h-4 w-4 text-yellow-500" />
            case "info":
                return <IconInfoCircle className="h-4 w-4 text-blue-500" />
            default:
                return <IconInfoCircle className="h-4 w-4 text-gray-500" />
        }
    }

    const getErrorColor = (type: string) => {
        switch (type) {
            case "error":
                return "destructive"
            case "warning":
                return "secondary"
            case "info":
                return "default"
            default:
                return "default"
        }
    }

    // Auto-execute when language changes
    useEffect(() => {
        if (!code) {
            setCode(defaultCode[activeLanguage])
        }
    }, [activeLanguage, code])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (executionTimeoutRef.current) {
                clearTimeout(executionTimeoutRef.current)
            }
        }
    }, [])

    const codeLines = (code || defaultCode[activeLanguage]).split("\n")

    return (
        <>
            <FloatingNav />
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: "none" }}
                accept=".java,.py,.cpp,.c,.h"
            />

            <div className="min-h-screen w-full bg-black relative flex flex-col items-center antialiased">
                <BackgroundLines className="flex items-center justify-center w-full flex-col px-4 py-20">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2 mb-6">
                                <IconBug className="h-4 w-4 text-red-400" />
                                <span className="text-sm text-red-300 font-medium">Advanced Multi-Language Debugger</span>
                            </div>

                            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-b from-white via-red-100 to-red-400 bg-clip-text text-transparent mb-6">
                                Code Debugger
                            </h1>

                            <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed mb-8">
                                Professional debugging with breakpoints, variable tracking, call stack, and step-by-step execution.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Code Editor */}
                            <div className="lg:col-span-3">
                                <Card className="bg-neutral-900/80 border-neutral-700">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-white">Code Editor</CardTitle>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    <IconFileUpload className="h-4 w-4 mr-2" />
                                                    Load File
                                                </Button>
                                                <Button onClick={resetDebugger} size="sm" variant="bordered">
                                                    <IconRefresh className="h-4 w-4 mr-2" />
                                                    Reset
                                                </Button>
                                            </div>
                                        </div>
                                        <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
                                            <TabsList className="bg-neutral-800">
                                                <TabsTrigger value="java">Java</TabsTrigger>
                                                <TabsTrigger value="python">Python</TabsTrigger>
                                                <TabsTrigger value="cpp">C++</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="relative">
                                            {/* Line numbers and breakpoints */}
                                            <div className="absolute left-0 top-0 w-12 bg-neutral-800 border-r border-neutral-600 h-full z-10">
                                                {codeLines.map((_, index) => (
                                                    <div
                                                        key={index}
                                                        className="h-6 flex items-center justify-center text-xs text-neutral-400 cursor-pointer hover:bg-neutral-700 relative"
                                                        onClick={() => toggleBreakpoint(index + 1)}
                                                    >
                            <span className="absolute left-1">
                              {debugState.breakpoints.has(index + 1) ? (
                                  <IconCircleFilled className="h-3 w-3 text-red-500" />
                              ) : (
                                  <IconCircle className="h-3 w-3 text-neutral-600" />
                              )}
                            </span>
                                                        <span className="ml-4">{index + 1}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Code area */}
                                            <div className="ml-12 relative">
                                                <Textarea
                                                    value={code || defaultCode[activeLanguage]}
                                                    onChange={(e) => setCode(e.target.value)}
                                                    className="min-h-[500px] font-mono text-sm bg-neutral-800 border-neutral-600 text-white pl-4"
                                                    placeholder={`Enter your ${activeLanguage} code here...`}
                                                />

                                                {/* Current line highlight */}
                                                {debugState.isRunning && debugState.currentLine > 0 && (
                                                    <div
                                                        className="absolute left-0 bg-yellow-500/20 border-l-4 border-yellow-500 w-full pointer-events-none"
                                                        style={{
                                                            top: `${(debugState.currentLine - 1) * 24 + 8}px`,
                                                            height: "24px",
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Debug Controls */}
                                        <div className="flex gap-2 mt-4 flex-wrap">
                                            {!debugState.isRunning ? (
                                                <Button onClick={startDebugging} className="bg-green-600 hover:bg-green-700">
                                                    <IconPlayerPlay className="h-4 w-4 mr-2" />
                                                    Start Debug
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button onClick={stopDebugging} className="bg-red-600 hover:bg-red-700">
                                                        <IconPlayerStop className="h-4 w-4 mr-2" />
                                                        Stop
                                                    </Button>
                                                    {debugState.isPaused ? (
                                                        <Button onClick={continueExecution} className="bg-blue-600 hover:bg-blue-700">
                                                            <IconPlayerPlay className="h-4 w-4 mr-2" />
                                                            Continue
                                                        </Button>
                                                    ) : null}
                                                    <Button onClick={stepOver} variant="bordered">
                                                        <IconCornerRightDownDouble className="h-4 w-4 mr-2" />
                                                        Step Over
                                                    </Button>
                                                    <Button onClick={stepInto} variant="bordered">
                                                        <IconStepInto className="h-4 w-4 mr-2" />
                                                        Step Into
                                                    </Button>
                                                </>
                                            )}

                                            <div className="flex items-center gap-2 ml-auto">
                                                <label className="text-sm text-white">Auto Run:</label>
                                                <input
                                                    type="checkbox"
                                                    checked={autoRun}
                                                    onChange={(e) => setAutoRun(e.target.checked)}
                                                    className="rounded"
                                                />
                                                <label className="text-sm text-white">Speed (ms):</label>
                                                <Input
                                                    type="number"
                                                    value={executionSpeed}
                                                    onChange={(e) => setExecutionSpeed(Number.parseInt(e.target.value) || 1000)}
                                                    className="w-20 h-8"
                                                    min="100"
                                                    max="5000"
                                                    step="100"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Debug Panel */}
                            <div className="space-y-4">
                                {/* Debug Status */}
                                <Card className="bg-neutral-900/80 border-neutral-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-white text-sm">Debug Status</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-neutral-400">Language:</span>
                                                <span className="text-white capitalize">{activeLanguage}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-400">Line:</span>
                                                <span className="text-white">{debugState.currentLine || "Not debugging"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-400">Status:</span>
                                                <span
                                                    className={`${debugState.isRunning ? (debugState.isPaused ? "text-yellow-400" : "text-green-400") : "text-neutral-400"}`}
                                                >
                          {debugState.isRunning ? (debugState.isPaused ? "Paused" : "Running") : "Stopped"}
                        </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-400">Breakpoints:</span>
                                                <span className="text-white">{debugState.breakpoints.size}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Variables Panel */}
                                <Card className="bg-neutral-900/80 border-neutral-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-white flex items-center gap-2 text-sm">
                                            <IconVariable className="h-4 w-4" />
                                            Variables ({debugState.variables.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ScrollArea className="h-32">
                                            <div className="space-y-1">
                                                {debugState.variables.length === 0 ? (
                                                    <p className="text-xs text-neutral-400">No variables to display</p>
                                                ) : (
                                                    debugState.variables.map((variable, index) => (
                                                        <div key={index} className="p-2 bg-neutral-800 rounded text-xs">
                                                            <div className="flex justify-between items-start">
                                                                <span className="font-mono text-blue-400">{variable.name}</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {variable.type}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-white mt-1">
                                                                {Array.isArray(variable.value)
                                                                    ? `[${variable.value.join(", ")}]`
                                                                    : String(variable.value)}
                                                            </div>
                                                            <div className="text-neutral-500 text-xs">{variable.scope}</div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>

                                {/* Call Stack */}
                                <Card className="bg-neutral-900/80 border-neutral-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-white text-sm">Call Stack</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ScrollArea className="h-24">
                                            <div className="space-y-1">
                                                {debugState.callStack.length === 0 ? (
                                                    <p className="text-xs text-neutral-400">No call stack</p>
                                                ) : (
                                                    debugState.callStack
                                                        .slice(-3)
                                                        .reverse()
                                                        .map((frame, index) => (
                                                            <div key={index} className="p-2 bg-neutral-800 rounded text-xs">
                                                                <div className="font-mono text-green-400">{frame.function}</div>
                                                                <div className="text-neutral-400">Line {frame.line}</div>
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>

                                {/* Output Console */}
                                <Card className="bg-neutral-900/80 border-neutral-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-white flex items-center gap-2 text-sm">
                                            <IconTerminal className="h-4 w-4" />
                                            Output
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ScrollArea className="h-32">
                                            <div className="space-y-1">
                                                {debugState.output.length === 0 ? (
                                                    <p className="text-xs text-neutral-400">No output</p>
                                                ) : (
                                                    debugState.output.map((line, index) => (
                                                        <div key={index} className="text-xs font-mono text-green-400 bg-neutral-800 p-1 rounded">
                                                            {line}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>

                                {/* Errors Panel */}
                                <Card className="bg-neutral-900/80 border-neutral-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-white flex items-center gap-2 text-sm">
                                            <IconBug className="h-4 w-4" />
                                            Issues ({debugState.errors.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ScrollArea className="h-32">
                                            <div className="space-y-1">
                                                {debugState.errors.length === 0 ? (
                                                    <div className="flex items-center gap-2 text-green-400">
                                                        <IconCircleDashedCheck className="h-3 w-3" />
                                                        <span className="text-xs">No issues found</span>
                                                    </div>
                                                ) : (
                                                    debugState.errors.map((error, index) => (
                                                        <div key={index} className="p-2 bg-neutral-800 rounded text-xs">
                                                            <div className="flex items-start gap-2">
                                                                {getErrorIcon(error.type)}
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <Badge variant={getErrorColor(error.type)} className="text-xs">
                                                                            Line {error.line}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {error.type}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-white mb-1">{error.message}</p>
                                                                    {error.suggestion && <p className="text-neutral-400">{error.suggestion}</p>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </BackgroundLines>
            </div>
        </>
    )
}
