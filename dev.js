const { spawn } = require('child_process');
const path = require('path');

// The ELECTRON_RUN_AS_NODE env var makes Electron run as plain Node.
// Unset it before spawning the real Electron process.
delete process.env.ELECTRON_RUN_AS_NODE;

const electron = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
const child = spawn(electron, ['.'], { stdio: 'inherit', cwd: __dirname });

child.on('close', (code) => process.exit(code));
