async function main() {
                let pyodide = await loadPyodide();
                // Pyodide is now ready to use...
                console.log(pyodide.runPython(`
                import sys
                sys.version
                `));
            };
            main();
            var editor = document.getElementByID(ed);
            var code = editor.getValue();
            pyodide.runPython(code);