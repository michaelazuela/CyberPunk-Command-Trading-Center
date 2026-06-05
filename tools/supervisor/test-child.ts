process.stdout.write(`supervisor test child started: ${process.pid}\n`);

setInterval(() => {
  process.stdout.write(`supervisor test child heartbeat: ${new Date().toISOString()}\n`);
}, 1_000);
