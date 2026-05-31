import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const blogDir = path.join(root, "src", "blog");
const outputFile = path.join(root, ".generated-urls.json");
const banned = [/seo/i, /关键词/g, /优化/g, /排名/g, /收录/g, /曝光/g];
const tagPool = [
  "Windows客户端",
  "macOS客户端",
  "Android客户端",
  "iOS客户端",
  "连接维护",
  "设备检查",
  "远程办公",
  "学习场景",
  "账号安全",
  "浏览器设置",
  "出行场景",
  "移动端"
];

function getCount() {
  const arg = process.argv.find((item) => item.startsWith("--count="));
  const raw = arg ? arg.split("=")[1] : process.env.GENERATE_COUNT || "1";
  const count = Number.parseInt(raw, 10);
  if (!Number.isInteger(count) || count < 1 || count > 9) {
    throw new Error("Count must be between 1 and 9.");
  }
  return count;
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/quickq/g, "quickq")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function cleanText(input) {
  let text = String(input || "");
  for (const pattern of banned) text = text.replace(pattern, "");
  return text.trim();
}

function pickTags(seed) {
  const first = tagPool[seed % tagPool.length];
  const second = tagPool[(seed + 4) % tagPool.length];
  const third = tagPool[(seed + 8) % tagPool.length];
  return [...new Set([first, second, third])];
}

function frontMatter(data) {
  const tags = JSON.stringify(data.tags);
  return `---\nlayout: article.njk\ntitle: ${data.title}\ndescription: ${data.description}\ndate: ${data.date}\ncategory: ${data.category}\ntags: ${tags}\nheroImage: "${data.heroImage}"\nheroAlt: "${data.heroAlt}"\n---\n\n${data.body}\n`;
}

async function createArticle(ai, index) {
  const today = new Date();
  const date = today.toISOString().slice(0, 10);
  const seed = Math.floor(Date.now() / 1000) + index;
  const tags = pickTags(seed);
  const topic = tags.join("、");
  const prompt = [
    "Write one original Chinese markdown article for a normal quickq resource website.",
    "Return strict JSON only with fields: title, description, category, body.",
    "The title must start with quickq and be a long-tail article title.",
    `Topic direction: ${topic}.`,
    "Body must use h2/h3 headings only, no h1, 650-900 Chinese characters.",
    "Do not include external links, promotional claims, or words: seo, 关键词, 优化, 排名, 收录, 曝光."
  ].join("\n");

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });
  const raw = result.text.replace(/^```json|```$/g, "").trim();
  const parsed = JSON.parse(raw);
  const title = cleanText(parsed.title).startsWith("quickq")
    ? cleanText(parsed.title)
    : `quickq ${cleanText(parsed.title)}`;
  const description = cleanText(parsed.description).slice(0, 120);
  const category = cleanText(parsed.category || tags[0]);
  const body = cleanText(parsed.body);
  const slug = `${slugify(title)}-${Date.now()}-${index}`;

  return {
    slug,
    url: `/blog/${slug}/`,
    content: frontMatter({
      title,
      description,
      date,
      category,
      tags,
      heroImage: `https://tse-mm.bing.com/th?q=${encodeURIComponent(title)}`,
      heroAlt: `${title} 配图`,
      body
    })
  };
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Set GEMINI_API_KEY or GOOGLE_API_KEY before generating articles.");

  const ai = new GoogleGenAI({ apiKey });
  const count = getCount();
  await fs.mkdir(blogDir, { recursive: true });

  const urls = [];
  for (let i = 0; i < count; i += 1) {
    const article = await createArticle(ai, i);
    await fs.writeFile(path.join(blogDir, `${article.slug}.md`), article.content, "utf8");
    urls.push(article.url);
  }

  await fs.writeFile(outputFile, JSON.stringify({ urls }, null, 2), "utf8");
  console.log(`Generated ${urls.length} article(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
