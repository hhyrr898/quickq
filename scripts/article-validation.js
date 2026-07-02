export function countChineseChars(text) {
  return (text.match(/[\u4e00-\u9fa5]/g) || []).length;
}

export function getCharLimits(style) {
  if (style?.id === "brief") {
    return { min: 350, max: 900 };
  }
  return { min: 750, max: 2200 };
}

export function formatLengthHint(style) {
  const { min, max } = getCharLimits(style);
  return `${min}-${max}字`;
}

export async function shortenBodyIfNeeded(ai, body, maxChars) {
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      `将下面 markdown 正文压缩到不超过 ${maxChars} 个汉字（仅计汉字），保留：`,
      "① 一个具体版本号或日期",
      "② 至少 3 个操作步骤",
      "③ 「## 常见问题」小节",
      "④ 至少一段第一人称",
      "⑤ 原有 h2/h3 结构与本地配图占位",
      "只返回严格 JSON：{\"body\":\"...\"}",
      "",
      body
    ].join("\n")
  });
  const raw = String(result.text || "")
    .replace(/^```json\s*|```$/g, "")
    .trim();
  const parsed = JSON.parse(raw);
  return String(parsed.body || "").trim();
}
