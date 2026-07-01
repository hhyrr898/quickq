import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOMAIN = process.env.BING_DOMAIN || "quickq-cn.com";
const BING_KEY = (process.env.INDEXNOW_KEY || "").trim();
const OUTPUT_DIR = path.join(__dirname, "..", "_site");

function getAllHtmlFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  for (const file of fs.readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) getAllHtmlFiles(fullPath, arrayOfFiles);
    else if (file.endsWith(".html")) arrayOfFiles.push(fullPath);
  }
  return arrayOfFiles;
}

function toPublicUrl(relativePath) {
  let normalized = relativePath.replace(/\\/g, "/");
  if (normalized.endsWith("index.html")) normalized = normalized.slice(0, -10);
  else if (normalized.endsWith(".html")) normalized = normalized.slice(0, -5);
  return `https://${DOMAIN}/${normalized}`;
}

function isIndexableUrl(url) {
  const pathname = new URL(url).pathname;
  if (pathname === "/" || pathname === "/blog/" || pathname === "/about/" || pathname === "/download.html") return true;
  return /^\/blog\/quickq-[a-z0-9-]+\/$/.test(pathname);
}

function postIndexNow(requestData) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.indexnow.org",
        path: "/IndexNow",
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(requestData),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ statusCode: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    req.write(requestData);
    req.end();
  });
}

async function main() {
  if (!BING_KEY) {
    console.log("INDEXNOW_KEY not set, skip.");
    return;
  }
  let urlList = [...new Set(getAllHtmlFiles(OUTPUT_DIR).map((f) => toPublicUrl(path.relative(OUTPUT_DIR, f))))].filter(isIndexableUrl);
  if (!urlList.length) return;
  const requestData = JSON.stringify({
    host: DOMAIN,
    key: BING_KEY,
    keyLocation: `https://${DOMAIN}/${BING_KEY}.txt`,
    urlList,
  });
  const { statusCode, body } = await postIndexNow(requestData);
  console.log(`IndexNow ${statusCode}: ${body}`);
  if (statusCode !== 200 && statusCode !== 202) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
