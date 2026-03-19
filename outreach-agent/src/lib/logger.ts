import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "../../logs");

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const logFile = path.join(LOG_DIR, `agent-${timestamp}.log`);

fs.mkdirSync(LOG_DIR, { recursive: true });
const stream = fs.createWriteStream(logFile, { flags: "a" });

function write(level: string, message: string) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  stream.write(line + "\n");
  if (level === "ERROR") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (msg: string) => write("INFO", msg),
  warn: (msg: string) => write("WARN", msg),
  error: (msg: string) => write("ERROR", msg),
  debug: (msg: string) => write("DEBUG", msg),
  logFile,
};
