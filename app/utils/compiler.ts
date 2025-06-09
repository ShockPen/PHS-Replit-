export interface CompilationResult {
  success: boolean;
  output?: string;
  error?: string;
  executable?: Uint8Array;
  executionOutput?: string;
  executionError?: string;
}

export class CppCompiler {
  private wasmModule: any = null;
  private isInitialized = false;
  private fileSystem: any = null;

  constructor() {
    this.initializeCompiler();
  }

  private async initializeCompiler(): Promise<void> {
    try {
      // Load the shared utilities first
      await this.loadScript('/wasm-clang/shared.js');
      await this.loadScript('/wasm-clang/shared_web.js');
      
      // Initialize the WebAssembly module
      if (typeof window !== 'undefined' && (window as any).createWasmClang) {
        this.wasmModule = await (window as any).createWasmClang();
        this.fileSystem = this.wasmModule.FS;
        
        // Create necessary directories
        this.fileSystem.mkdir('/tmp');
        this.fileSystem.mkdir('/workspace');
        
        this.isInitialized = true;
        console.log('C++ Compiler initialized successfully');
      } else {
        throw new Error('wasm-clang not available');
      }
    } catch (error) {
      console.error('Failed to initialize compiler:', error);
      throw error;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Document not available'));
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  private async waitForInitialization(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (!this.isInitialized && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.isInitialized) {
      throw new Error('Compiler initialization timeout');
    }
  }

  public async compile(code: string, filename: string = 'main.cpp'): Promise<CompilationResult> {
    try {
      await this.waitForInitialization();

      // Clean up previous files
      this.cleanupFiles();

      // Write source code to virtual file system
      const sourcePath = `/workspace/${filename}`;
      const outputPath = '/workspace/output';
      
      this.fileSystem.writeFile(sourcePath, code);

      // Prepare compilation arguments
      const args = [
        'clang++',
        '-std=c++17',
        '-O2',
        '-o', outputPath,
        sourcePath
      ];

      console.log('Compiling with args:', args);

      // Capture stdout and stderr
      let stdout = '';
      let stderr = '';
      
      const originalStdout = this.wasmModule.FS.streams[1];
      const originalStderr = this.wasmModule.FS.streams[2];

      // Redirect stdout and stderr
      this.wasmModule.FS.streams[1] = {
        write: (buf: Uint8Array) => {
          stdout += new TextDecoder().decode(buf);
          return buf.length;
        }
      };

      this.wasmModule.FS.streams[2] = {
        write: (buf: Uint8Array) => {
          stderr += new TextDecoder().decode(buf);
          return buf.length;
        }
      };

      let exitCode: number;
      try {
        exitCode = this.wasmModule.callMain(args);
      } finally {
        // Restore original streams
        this.wasmModule.FS.streams[1] = originalStdout;
        this.wasmModule.FS.streams[2] = originalStderr;
      }

      if (exitCode === 0) {
        // Compilation successful, try to read the executable
        try {
          const executable = this.fileSystem.readFile(outputPath);
          
          // Try to execute the compiled program
          const executionResult = await this.executeProgram(executable);
          
          return {
            success: true,
            output: stdout || 'Compilation successful',
            executable,
            executionOutput: executionResult.output,
            executionError: executionResult.error
          };
        } catch (readError) {
          return {
            success: true,
            output: stdout || 'Compilation successful, but could not read executable',
            error: `Could not read executable: ${readError}`
          };
        }
      } else {
        return {
          success: false,
          error: stderr || stdout || 'Compilation failed with unknown error'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Compilation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async executeProgram(executable: Uint8Array): Promise<{output: string, error: string}> {
    try {
      // Write executable to file system
      const execPath = '/workspace/program';
      this.fileSystem.writeFile(execPath, executable);
      this.fileSystem.chmod(execPath, 0o755);

      let output = '';
      let error = '';

      // Capture execution output
      const originalStdout = this.wasmModule.FS.streams[1];
      const originalStderr = this.wasmModule.FS.streams[2];

      this.wasmModule.FS.streams[1] = {
        write: (buf: Uint8Array) => {
          output += new TextDecoder().decode(buf);
          return buf.length;
        }
      };

      this.wasmModule.FS.streams[2] = {
        write: (buf: Uint8Array) => {
          error += new TextDecoder().decode(buf);
          return buf.length;
        }
      };

      try {
        // Execute the program
        const exitCode = this.wasmModule.callMain([execPath]);
        
        return {
          output: output || 'Program executed successfully',
          error: exitCode !== 0 ? (error || `Program exited with code ${exitCode}`) : ''
        };
      } finally {
        // Restore streams
        this.wasmModule.FS.streams[1] = originalStdout;
        this.wasmModule.FS.streams[2] = originalStderr;
      }

    } catch (execError) {
      return {
        output: '',
        error: `Execution error: ${execError instanceof Error ? execError.message : String(execError)}`
      };
    }
  }

  private cleanupFiles(): void {
    try {
      const workspaceFiles = this.fileSystem.readdir('/workspace');
      for (const file of workspaceFiles) {
        if (file !== '.' && file !== '..') {
          try {
            this.fileSystem.unlink(`/workspace/${file}`);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    } catch (e) {
      // Ignore if workspace doesn't exist
    }
  }

  public async compileAndRun(code: string, filename?: string): Promise<CompilationResult> {
    return this.compile(code, filename);
  }

  public isReady(): boolean {
    return this.isInitialized;
  }
}

// Create a single instance
const compiler = new CppCompiler();

// Export the instance directly
export default compiler;