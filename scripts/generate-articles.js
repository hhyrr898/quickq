import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const blogDir = path.join(root, "src", "blog");
const outputFile = path.join(root, ".generated-urls.json");

const bannedPatterns = [
  /seo/gi,
  /关键词/g,
  /优化/g,
  /排名/g,
  /收录/g,
  /曝光/g,
  /综上所述/g,
  /毋庸置疑/g,
  /在当今数字化时代/g,
  /业界领先/g,
  /全方位/g,
  /深度融合/g,
  /极致/g,
  /深入探讨/g,
  /详细介绍/g,
  /全面解析/g,
  /助力您/g,
  /显著提升/g,
  /至关重要/g,
  /完美支持/g,
  /强大功能/g,
  /原生体验/g
];

const bannedTitlePatterns = [/白皮书/, /完整指南/, /全面指南/, /深度解析/, /技术详解/, /实用指南$/, /高效.*指南/, /全攻略/];

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

const articleStyles = [
  {
    id: "tutorial",
    name: "教程型",
    length: "800-1500字",
    structure: [
      "开头用一两句话交代场景，别写空话套话。",
      "正文用 h2/h3 分节，至少写 3 个带序号的具体操作步骤。",
      "至少一处描述客户端界面画面（如「连接按钮」「设置页」）。",
      "单独一节「## 常见问题」，列 2-4 个真实会遇到的问题和解决办法。"
    ]
  },
  {
    id: "review",
    name: "评测型",
    length: "800-1500字",
    structure: [
      "开头说明你在什么环境下测的（系统版本、quickq 版本）。",
      "选 3 个维度打分（如易用性、稳定性、移动端体验），每个维度用 h3 写分数和理由。",
      "结尾单独一节「## 常见问题」。"
    ]
  },
  {
    id: "faq",
    name: "问答型",
    length: "800-1500字",
    structure: [
      "开头 2-3 句说明这篇文章解决什么问题。",
      "正文写 5 个 FAQ，每个用 h3 做问句标题，答案要具体、能照着做。",
      "最后加一节「## 常见问题」补充 1-2 个边角问题。"
    ]
  },
  {
    id: "brief",
    name: "快讯型",
    length: "300-600字",
    structure: [
      "短平快，像博客快讯，不要铺垫太长。",
      "必须写清楚一个具体版本号或日期（如 quickq 2.8.4 或 2026-06-20）。",
      "至少 3 步操作，步骤要短。",
      "文末一小节「## 常见问题」，1-2 条即可。"
    ]
  }
];

const firstPersonHints = ["我测试时发现", "上周升级后", "昨天重装系统", "我自己习惯", "我踩过一个坑", "我一般会先"];

const pillarLinks = [
  "/blog/quickq-windows-install-guide/",
  "/blog/quickq-macos-install-steps/",
  "/blog/quickq-android-start/",
  "/blog/quickq-ios-setup-guide/",
  "/blog/quickq-connection-maintenance/",
  "/blog/quickq-account-safety/"
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
  for (const pattern of bannedPatterns) {
    text = text.replace(pattern, "");
  }
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function pickTags(seed) {
  const first = tagPool[seed % tagPool.length];
  const second = tagPool[(seed + 4) % tagPool.length];
  const third = tagPool[(seed + 8) % tagPool.length];
  return [...new Set([first, second, third])];
}

function pickStyle(seed) {
  return articleStyles[seed % articleStyles.length];
}

function countChineseChars(text) {
  return (text.match(/[\u4e00-\u9fa5]/g) || []).length;
}

function hasVersionOrDate(text) {
  return (
    /\d+\.\d+(\.\d+)?/.test(text) ||
    /20\d{2}[-年/]\d{1,2}([-月/]\d{1,2}日?)?/.test(text) ||
    /quickq\s*\d/i.test(text) ||
    /Windows\s*(10|11)/i.test(text) ||
    /macOS/i.test(text)
  );
}

function hasOperationSteps(text) {
  const stepMarkers =
    (text.match(/第[一二三四五六七八九十\d]+步/g) || []).length +
    (text.match(/^\s*\d+\.\s+/gm) || []).length +
    (text.match(/步骤\s*[一二三四五六七八九十\d]/g) || []).length;
  return stepMarkers >= 3;
}

function hasFaqSection(text) {
  return /##\s*常见问题/.test(text);
}

function hasFirstPerson(text) {
  return /我[^们]|上周|昨天|前几天|测试时|重装后|升级后/.test(text);
}

function isTitleAcceptable(title) {
  if (bannedTitlePatterns.some((pattern) => pattern.test(title))) return false;
  if (title.length > 42) return false;
  return true;
}

function validateArticle({ title, body, style }) {
  const issues = [];
  const charCount = countChineseChars(body);
  const minChars = style.id === "brief" ? 280 : 750;
  const maxChars = style.id === "brief" ? 650 : 1550;

  if (!isTitleAcceptable(title)) issues.push("标题太官腔或过长，应像博客标题");
  if (charCount < minChars || charCount > maxChars) issues.push(`正文字数 ${charCount}，应在 ${minChars}-${maxChars} 之间`);
  if (!hasVersionOrDate(body)) issues.push("正文缺少具体版本号或日期");
  if (!hasOperationSteps(body)) issues.push("正文缺少至少 3 个操作步骤");
  if (!hasFaqSection(body)) issues.push("缺少「## 常见问题」小节");
  if (!hasFirstPerson(body)) issues.push("缺少第一人称叙述");
  for (const pattern of bannedPatterns) {
    if (pattern.test(body) || pattern.test(title)) issues.push(`含有禁用词：${pattern}`);
  }
  return issues;
}

function frontMatter(data) {
  const tags = JSON.stringify(data.tags);
  return `---\nlayout: article.njk\ntitle: ${data.title}\ndescription: ${data.description}\ndate: ${data.date}\ngenerated: true\ncategory: ${data.category}\ntags: ${tags}\nheroImage: "${data.heroImage}"\nheroAlt: "${data.heroAlt}"\n---\n\n${data.body}\n`;
}

function buildPrompt({ topic, style, firstPersonHint }) {
  return [
    "你是技术博客的兼职作者，给普通用户写 quickq 使用实操帖，不是写白皮书，也不是产品宣传稿。",
    "写一篇关于 quickq 的原创简体中文 markdown 文章。",
    "只返回严格 JSON，字段：title, description, category, body。",
    "",
    "【标题】",
    "- 必须以 quickq 开头。",
    "- 像博客标题，口语化一点，例如「quickq Windows 连不上？我试了这三个办法」。",
    "- 禁止：白皮书、完整指南、全面指南、深度解析、全攻略 这类官腔标题。",
    "",
    `【结构】本次用${style.name}（${style.length}）`,
    ...style.structure.map((line) => `- ${line}`),
    "",
    "【硬性要求】",
    "- 正文只用 h2/h3，不要 h1。",
    "- 必须包含：①一个具体版本号或日期 ②至少 3 步操作步骤 ③「## 常见问题」小节。",
    `- 至少写一段第一人称，可参考：「${firstPersonHint}…」`,
    "- 段落长短错落，不要每段都 3-4 句一样长。",
    "- 禁止用词：综上所述、毋庸置疑、在当今数字化时代、业界领先、全方位、深度融合、极致。",
    "- 禁止：seo、关键词、优化、排名、收录、曝光。",
    "- 不要外链，不要促销话术。",
    `- 正文内链 2～5 条，优先链到：${pillarLinks.join("、")} 等本站教程。`,
    "- 插入一张本地配图占位：![配图说明](/static/images/photo-1486406146926-c627a92ad1ab.jpg)（可换不同 /static/images/ 路径，禁止 bing 热链）。",
    "",
    `【主题方向】${topic}`,
    "",
    "【description】",
    "- 80-120 字，像搜索摘要，直接说能帮读者解决什么。"
  ].join("\n");
}

async function createArticle(ai, index) {
  const today = new Date();
  const date = today.toISOString().slice(0, 10);
  const seed = Math.floor(Date.now() / 1000) + index;
  const tags = pickTags(seed);
  const style = pickStyle(seed);
  const topic = tags.join("、");
  const firstPersonHint = firstPersonHints[seed % firstPersonHints.length];
  const prompt = buildPrompt({ topic, style, firstPersonHint });

  let parsed = null;
  let lastIssues = [];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const retryNote =
      attempt > 0 ? `\n\n上次生成不合格，请修正：${lastIssues.join("；")}。重新生成完整 JSON。` : "";
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt + retryNote
    });
    const raw = result.text.replace(/^```json\s*|```$/g, "").trim();
    parsed = JSON.parse(raw);

    const title = cleanText(parsed.title).startsWith("quickq")
      ? cleanText(parsed.title)
      : `quickq ${cleanText(parsed.title)}`;
    const body = cleanText(parsed.body);
    lastIssues = validateArticle({ title, body, style });

    if (lastIssues.length === 0) {
      const description = cleanText(parsed.description).slice(0, 120);
      const category = cleanText(parsed.category || tags[0]);
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
          heroImage: `/static/images/photo-1486406146926-c627a92ad1ab.jpg`,
          heroAlt: `${title} 配图`,
          body
        })
      };
    }
  }

  throw new Error(`Article validation failed after 3 attempts: ${lastIssues.join("；")}`);
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
