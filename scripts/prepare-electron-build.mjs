import { execSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const processes = process.platform === 'win32'
  ? ['ZenTicket.exe', 'ZenTicket Helper.exe', 'electron.exe']
  : ['ZenTicket', 'Electron'];

const tryKill = (proc) => {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /IM "${proc}" /F`, { stdio: 'ignore' });
    } else {
      execSync(`pkill -f ${proc}`, { stdio: 'ignore' });
    }
    console.log(`[prebuild] Closed process: ${proc}`);
  } catch {
    // process not running
  }
};

for (const proc of processes) {
  tryKill(proc);
}

await delay(500);
