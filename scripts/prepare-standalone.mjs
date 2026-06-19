import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const standaloneNextDir = path.join(rootDir, ".next", "standalone", ".next");
const staticSourceDir = path.join(rootDir, ".next", "static");
const staticTargetDir = path.join(standaloneNextDir, "static");

await mkdir(standaloneNextDir, { recursive: true });
await rm(staticTargetDir, { recursive: true, force: true });
await cp(staticSourceDir, staticTargetDir, { recursive: true });

console.log("Standalone static assets copied.");
