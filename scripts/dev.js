const { spawn } = require('child_process');

const procs = [
  { name: 'server', cmd: 'npm', args: ['run', 'server'] },
  { name: 'client', cmd: 'npm', args: ['run', 'client'] },
];

const children = procs.map(({ name, cmd, args }) => {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
    shutdown(code || 0);
  });
  return child;
});

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(exitCode);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
