import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const siteUrl = (process.env.SITE_URL || "").trim().replace(/\/$/, "");
const apiKey = (process.env.BING_API_KEY || "").trim();

function getMode() {
  const arg = process.argv.find((item) => item.startsWith("--mode="));
  return arg ? arg.split("=")[1] : "updated";
}

async function readUpdatedUrls() {
  const file = path.join(root, ".generated-urls.json");
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  return (data.urls || []).map((url) => `${siteUrl}${url}`);
}

async function readAllUrls() {
  const sitemap = await fs.readFile(path.join(root, "_site", "sitemap.xml"), "utf8");
  return [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

async function submit(urls) {
  if (!apiKey) {
    console.log("Skip Bing submission: BING_API_KEY is not set.");
    return;
  }
  if (!siteUrl) {
    console.log("Skip Bing submission: SITE_URL is not set.");
    return;
  }
  if (!urls.length) {
    console.log("No URLs to submit.");
    return;
  }

  const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ siteUrl, urlList: urls })
  });

  const text = await response.text();
  if (!response.ok) {
    if (text.includes("InvalidApiKey")) {
      throw new Error(
        `Bing API key is invalid. Regenerate the key in Bing Webmaster Tools (Settings -> API Access), update the BING_API_KEY secret, and ensure ${siteUrl} is verified in Bing. Response: ${text}`
      );
    }
    throw new Error(`Bing submission failed: ${response.status} ${text}`);
  }
  console.log(`Submitted ${urls.length} URL(s) to Bing for ${siteUrl}.`);
}

async function main() {
  const mode = getMode();
  const urls = mode === "all" ? await readAllUrls() : await readUpdatedUrls();
  await submit(urls);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
