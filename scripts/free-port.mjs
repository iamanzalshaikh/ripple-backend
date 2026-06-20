/**
 * Dev helper — free a TCP port before restarting ripple-backend.
 * Usage: node scripts/free-port.mjs [port]
 */
import { execSync } from "node:child_process";

const port = process.argv[2] ?? "3007";

function freePortWindows(p) {
  try {
    const out = execSync(`netstat -ano | findstr :${p}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      console.log(`[free-port] stopping PID ${pid} on :${p}`);
      execSync(`taskkill /PID ${pid} /F`, { stdio: "inherit" });
    }
    if (pids.size === 0) {
      console.log(`[free-port] port ${p} is already free`);
    }
  } catch {
    console.log(`[free-port] port ${p} is already free`);
  }
}

function freePortUnix(p) {
  try {
    const out = execSync(`lsof -ti :${p}`, { encoding: "utf8" }).trim();
    if (!out) {
      console.log(`[free-port] port ${p} is already free`);
      return;
    }
    for (const pid of out.split(/\s+/)) {
      console.log(`[free-port] stopping PID ${pid} on :${p}`);
      execSync(`kill -9 ${pid}`, { stdio: "inherit" });
    }
  } catch {
    console.log(`[free-port] port ${p} is already free`);
  }
}

if (process.platform === "win32") {
  freePortWindows(port);
} else {
  freePortUnix(port);
}
