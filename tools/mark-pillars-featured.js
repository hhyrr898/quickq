#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "src", "blog");

for (const file of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))) {
  if (!/^quickq-[a-z0-9-]+\.md$/i.test(file)) continue;
  const fp = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(fp, "utf-8");
  if (/^featured:\s*true/m.test(raw)) continue;
  if (!raw.startsWith("---")) continue;
  const end = raw.indexOf("\n---", 3);
  const fm = raw.slice(0, end + 4);
  const body = raw.slice(end + 4);
  fs.writeFileSync(fp, fm.replace(/\n---$/, "\nfeatured: true\n---") + body, "utf-8");
}
console.log("marked featured on pillar posts");
