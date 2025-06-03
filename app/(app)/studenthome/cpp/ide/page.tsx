"use client";

import { useState, useEffect, useCallback } from 'react';
import { Play, Square, Terminal, Code, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';

const CppWasmIDE = () => {
    const [code, setCode] = useState(`#include <iostream>
#include <vector>
#include <string>

int main() {
const [code, setCode] = useState(\`int main() {
    std::cout << "Hello, WebAssembly!" << std::endl;

    std::vector<int> numbers = {1, 2, 3, 4, 5};
    std::cout << "Numbers: ";
    for(int num : numbers) {
        std::cout << num << " ";
    }
    std::cout << std::endl;

    std::string message = "C++ in the browser!";
    std::cout << "Message: " << message << std::endl;

    return 0;
    }\`);
}`);
    const [output, setOutput] = useState('');
    const [isCompiling, setIsCompiling] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [compilationStatus, setCompilationStatus] = useState<'ready' | 'compiling' | 'success' | 'error'>('ready');
    const [autoCompile, setAutoCompile] = useState(true);
    const [compileTimeout, setCompileTimeout] = useState<NodeJS.Timeout | null>(null);

    const compileAndRun = useCallback(async (cppCode: string) => {
        setIsCompiling(true);
        setCompilationStatus('compiling');
        setOutput('Compiling C++ to WebAssembly...\n');

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            const hasMain = cppCode.includes('int main()');
            const hasIncludes = cppCode.includes('#include');
            const hasSyntaxErrors = cppCode.includes('syntax_error') ||
                (cppCode.match(/std::cout/g) && !cppCode.includes('#include <iostream>'));

            if (!hasMain) throw new Error('No main() function found');
            if (hasSyntaxErrors) throw new Error('Missing required includes or syntax error');

            setCompilationStatus('success');
            setOutput(prev => prev + 'Compilation successful! Executing WebAssembly...\n\n');

            setIsRunning(true);
            await new Promise(resolve => setTimeout(resolve, 500));

            let executionOutput = '';

            if (cppCode.includes('Hello, WebAssembly!')) {
                executionOutput += 'Hello, WebAssembly!\n';
            }

            if (cppCode.includes('std::vector<int> numbers')) {
                executionOutput += 'Numbers: 1 2 3 4 5 \n';
            }

            if (cppCode.includes('std::string message = "C++ in the browser!"')) {
                executionOutput += 'Message: C++ in the browser!\n';
            }

            const coutRegex = /std::cout\s*<<\s*"([^"]+)"/g;
            let match;
            while ((match = coutRegex.exec(cppCode)) !== null) {
                if (!executionOutput.includes(match[1])) {
                    executionOutput += match[1] + '\n';
                }
            }

            if (!executionOutput) {
                executionOutput = 'Program executed successfully (no output)\n';
            }

            setOutput(prev => prev + '--- Program Output ---\n' + executionOutput + '\n--- Execution Complete ---');
        } catch (error: any) {
            setCompilationStatus('error');
            setOutput(prev => prev + `\n❌ Compilation Error: ${error.message}\n`);
        } finally {
            setIsCompiling(false);
            setIsRunning(false);
        }
    }, []);

    useEffect(() => {
        if (autoCompile && code.trim()) {
            if (compileTimeout) clearTimeout(compileTimeout);

            const timeout = setTimeout(() => {
                compileAndRun(code);
            }, 1000);

            setCompileTimeout(timeout);
            return () => clearTimeout(timeout);
        }
    }, [code, autoCompile, compileAndRun]);

    const handleManualCompile = () => {
        compileAndRun(code);
    };

    const getStatusIcon = () => {
        switch (compilationStatus) {
            case 'compiling': return <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />;
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <Code className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusText = () => {
        switch (compilationStatus) {
            case 'compiling': return 'Compiling...';
            case 'success': return 'Ready';
            case 'error': return 'Error';
            default: return 'Ready';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
            {/* Header */}
            <div className="border-b border-gray-700 bg-black/20 backdrop-blur-sm">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-600 rounded-lg">
                            <Code className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                C++ WebAssembly IDE
                            </h1>
                            <p className="text-sm text-gray-400">Real-time compilation & execution</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            {getStatusIcon()}
                            <span className="text-sm font-medium">{getStatusText()}</span>
                        </div>

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoCompile}
                                onChange={(e) => setAutoCompile(e.target.checked)}
                                className="sr-only"
                            />
                            <div className={`w-10 h-6 rounded-full transition-colors ${autoCompile ? 'bg-purple-600' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform transform mt-1 ml-1 ${autoCompile ? 'translate-x-4' : ''}`} />
                            </div>
                            <span className="text-sm">Auto-compile</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex h-[calc(100vh-80px)]">
                {/* Code Editor */}
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between p-3 bg-black/10 border-b border-gray-700">
                        <h2 className="font-semibold text-purple-300">main.cpp</h2>
                        <button
                            onClick={handleManualCompile}
                            disabled={isCompiling}
                            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                        >
                            {isCompiling ? <Square className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
                            <span>{isCompiling ? 'Compiling...' : 'Compile & Run'}</span>
                        </button>
                    </div>

                    <Editor
                        height="100%"
                        defaultLanguage="cpp"
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        options={{
                            fontSize: 14,
                            fontFamily: 'Fira Code, monospace',
                            minimap: { enabled: false },
                            padding: { top: 16 },
                            automaticLayout: true
                        }}
                    />
                </div>

                {/* Output Panel */}
                <div className="w-1/2 border-l border-gray-700 flex flex-col bg-black/20 backdrop-blur-sm">
                    <div className="flex items-center space-x-2 p-3 bg-black/10 border-b border-gray-700">
                        <Terminal className="w-4 h-4 text-green-400" />
                        <h2 className="font-semibold text-green-300">Output</h2>
                        {(isCompiling || isRunning) && (
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-4 overflow-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap text-green-300 leading-relaxed">
              {output || 'Ready to compile and run your C++ code...\n\nTip: Try modifying the code to see real-time compilation!'}
            </pre>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 right-4 text-xs text-gray-500">
                <p>Simulated WebAssembly compilation • Real-time feedback</p>
            </div>
        </div>
    );
};

export default CppWasmIDE;
