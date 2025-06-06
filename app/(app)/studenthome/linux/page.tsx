'use client';

import React, { useEffect, useRef } from 'react';
import { Xterm } from 'xterm-react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const TerminalComponent = () => {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const term = new Terminal({
            cursorBlink: true,
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current!);
        fitAddon.fit();

        // Connect to backend WebSocket
        const socket = new WebSocket('ws://localhost:3001');

        term.onData((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
            socket.send(data);
        });

        socket.onmessage = e => {
            term.write(e.data);
        };

        return () => {
            term.dispose();
            socket.close();
        };
    }, []);

    return <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />;
};

export default TerminalComponent;
