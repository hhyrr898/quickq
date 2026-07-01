#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "src", "blog");
const DRY_RUN = process.argv.includes("--dry-run");

const PILLARS = [
  { path: "/blog/quickq-windows-install-guide/", label: "Windows 安装与连接", keywords: ["windows", "win10", "win11", "安装", "客户端", "桌面"] },
  { path: "/blog/quickq-macos-install-steps/", label: "macOS 安装步骤", keywords: ["macos", "mac", "苹果", "安装", "权限", "菜单栏"] },
  { path: "/blog/quickq-android-start/", label: "Android 上手配置", keywords: ["android", "安卓", "手机", "平板", "移动"] },
  { path: "/blog/quickq-ios-setup-guide/", label: "iOS 配置指南", keywords: ["ios", "iphone", "ipad", "苹果", "移动"] },
  { path: "/blog/quickq-account-safety/", label: "账号安全", keywords: ["账号", "安全", "登录", "密码", "设备管理"] },
  { path: "/blog/quickq-browser-settings/", label: "浏览器设置", keywords: ["浏览器", "chrome", "edge", "safari", "访问"] },
  { path: "/blog/quickq-connection-maintenance/", label: "连接维护", keywords: ["连接", "断开", "延迟", "稳定", "维护", "排查"] },
  { path: "/blog/quickq-device-checklist/", label: "设备检查清单", keywords: ["设备", "检查", "自检", "准备", "清单"] },
  { path: "/blog/quickq-multi-device-sync/", label: "多设备同步", keywords: ["多设备", "同步", "切换", "手机", "电脑"] },
  { path: "/blog/quickq-remote-work/", label: "远程办公场景", keywords: ["远程", "办公", "出差", "跨地点"] },
  { path: "/blog/quickq-speed-check/", label: "速度检查", keywords: ["速度", "测速", "延迟", "带宽", "慢"] },
  { path: "/blog/quickq-study-scenario/", label: "学习场景", keywords: ["学习", "课程", "资料", "学生", "碎片"] },
  { path: "/blog/quickq-travel-network/", label: "出行网络", keywords: ["出行", "旅行", "差旅", "热点", "漫游"] },
];

const DEFAULT_PILLARS = [PILLARS[0], PILLARS[6], PILLARS[4]];
const SECTION_HEADER = "## 延伸阅读";
const PILLAR_SKIP = new Set(PILLARS.map((p) => p.path.replace(/^\/blog\/|\//g, "") + ".md"));

function splitFrontMatter(raw) {
  if (!raw.startsWith("---")) return { fm: "", body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: "", body: raw };
  return { fm: raw.slice(0, end + 4), body: raw.slice(end + 4).replace(/^\s+/, "") };
}

function parseTitle(fm) {
  const m = fm.match(/^title:\s*(.*)$/m);
  return m ? m[1].replace(/^["']|["']$/g, "") : "";
}

function parseDescription(fm) {
  const m = fm.match(/^description:\s*(.*)$/m);
  return m ? m[1].replace(/^["']|["']$/g, "") : "";
}

function scorePillars(text) {
  const lower = text.toLowerCase();
  return PILLARS.map((p) => {
    let score = 0;
    for (const kw of p.keywords) {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      if (re.test(lower)) score += 1;
    }
    return { pillar: p, score };
  }).sort((a, b) => b.score - a.score);
}

function pickPillars(title, description, body, fileName) {
  const haystack = `${title}\n${description}\n${body.slice(0, 2000)}`;
  const ranked = scorePillars(haystack).filter((x) => x.score > 0);
  const chosen = [];
  for (const { pillar } of ranked) {
    if (chosen.length >= 3) break;
    const slug = pillar.path.replace(/^\/blog\/|\//g, "");
    if (fileName.includes(slug)) continue;
    if (!chosen.some((c) => c.path === pillar.path)) chosen.push(pillar);
  }
  if (chosen.length < 2) {
    for (const p of DEFAULT_PILLARS) {
      if (chosen.length >= 3) break;
      if (!chosen.some((c) => c.path === p.path)) chosen.push(p);
    }
  }
  return chosen.slice(0, 3);
}

function buildSection(pillars) {
  const lines = pillars.map((p) => `- [${p.label}](${p.path})`);
  return `\n${SECTION_HEADER}\n\n若需进一步查阅，可先看本站以下教程：\n\n${lines.join("\n")}\n`;
}

function processFile(filePath) {
  const fileName = path.basename(filePath);
  if (PILLAR_SKIP.has(fileName)) return { fileName, status: "skip-pillar" };
  const raw = fs.readFileSync(filePath, "utf-8");
  const { fm, body } = splitFrontMatter(raw);
  if (body.includes(SECTION_HEADER)) return { fileName, status: "skip-has-section" };
  const pillars = pickPillars(parseTitle(fm), parseDescription(fm), body, fileName);
  if (!pillars.length) return { fileName, status: "skip-no-pillars" };
  let newBody = body.trimEnd() + buildSection(pillars);
  const updated = `${fm}\n\n${newBody.replace(/^\n+/, "")}`;
  if (!DRY_RUN) fs.writeFileSync(filePath, updated.endsWith("\n") ? updated : `${updated}\n`, "utf-8");
  return { fileName, status: "updated" };
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
const results = files.map((f) => processFile(path.join(POSTS_DIR, f)));
console.log(`更新 ${results.filter((r) => r.status === "updated").length} 篇, 跳过 ${results.filter((r) => r.status !== "updated").length} 篇`);
