import fs from "fs";
import siteData from "./src/_data/site.json" with { type: "json" };

const systemTags = new Set([
  "all",
  "nav",
  "post",
  "posts",
  "blog",
  "indexableposts",
  "homepageposts",
]);

function assetVersion() {
  return siteData.assetVersion || "1";
}

function cacheBustStaticUrl(url) {
  const value = String(url || "").trim();
  if (!value.startsWith("/static/")) return value;
  if (/[?&]v=/.test(value)) return value;
  return `${value}?v=${assetVersion()}`;
}

function isPostIndexable(data, inputPath) {
  if (data.noindex === true) return false;
  if (data.featured === true) return true;
  if (data.generated === true) return false;

  const filePath = inputPath || "";
  if (/-\d{13}-\d+\.md$/i.test(filePath)) return false;

  const title = data.title || "";
  const description = data.description || "";
  const tags = Array.isArray(data.tags) ? data.tags : [];

  if (/官方权威|站群|SEO优化|友链|跨境流量|全攻略|产业智能|不二之选|业界领先/.test(title)) return false;
  if (/SEO优化|自动检测|狂降\d+%/.test(title)) return false;
  if (/小伙伴们注意|手把手教你|个人开发者项目，由社区驱动/.test(description)) return false;
  if (tags.some((t) => String(t).toLowerCase() === "seo")) return false;

  if (/\/blog\/quickq-[a-z0-9-]+\.md$/i.test(filePath)) return true;

  return false;
}

export default function (eleventyConfig) {
  eleventyConfig.ignores.add("CONTENT-LINK-RULES.md");

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "src/static": "static" });
  eleventyConfig.addPassthroughCopy({ "src/images.txt": "images.txt" });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  if (fs.existsSync("src/BingSiteAuth.xml")) {
    eleventyConfig.addPassthroughCopy({ "src/BingSiteAuth.xml": "BingSiteAuth.xml" });
  }
  for (const name of fs.readdirSync("src")) {
    if (/^[0-9a-f-]{20,}\.txt$/i.test(name)) {
      eleventyConfig.addPassthroughCopy({ [`src/${name}`]: name });
    }
  }

  eleventyConfig.addFilter("assetUrl", cacheBustStaticUrl);

  eleventyConfig.addTransform("cache-bust-static-assets", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    const version = assetVersion();
    return content.replace(
      /\/static\/[^"'\s<>]+\.(?:svg|jpg|png|webp)(?![^"']*[?&]v=)/g,
      (path) => `${path}?v=${version}`
    );
  });

  eleventyConfig.addGlobalData("eleventyComputed", {
    noindex: (data) => {
      if (data.noindex === true) return true;
      const inputPath = data.page?.inputPath || "";
      if (inputPath.includes("/tags/")) return true;
      if (!inputPath.includes("/blog/")) return false;
      if (inputPath.endsWith("blog/index.njk")) return false;
      return !isPostIndexable(data, inputPath);
    },
  });

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return "";
    const date = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return date.toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    if (!dateObj) return "";
    const date = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return date.toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("publicTags", (tags = []) => {
    return tags.filter((tag) => !systemTags.has(String(tag).toLowerCase()));
  });

  eleventyConfig.addFilter("tagSlug", (tag = "") => {
    return encodeURIComponent(String(tag).trim()).replace(/%/g, "").toLowerCase();
  });

  eleventyConfig.addFilter("sortByDateDesc", (posts = []) => {
    return [...posts].sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addFilter("limit", (arr, limit) => {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, limit);
  });

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/blog/*.md").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("indexablePosts", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/blog/*.md")
      .filter((item) => isPostIndexable(item.data, item.inputPath))
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("homepagePosts", (collectionApi) => {
    const posts = collectionApi
      .getFilteredByGlob("src/blog/*.md")
      .filter((item) => isPostIndexable(item.data, item.inputPath));
    const pillars = posts
      .filter((item) => /\/blog\/quickq-[a-z0-9-]+\.md$/i.test(item.inputPath))
      .sort((a, b) => a.inputPath.localeCompare(b.inputPath, "zh-CN"));
    const featured = posts
      .filter((item) => !/\/blog\/quickq-[a-z0-9-]+\.md$/i.test(item.inputPath))
      .sort((a, b) => b.date - a.date);
    return [...pillars, ...featured].slice(0, 8);
  });

  eleventyConfig.addCollection("publicTags", (collectionApi) => {
    const tags = new Set();
    collectionApi
      .getFilteredByGlob("src/blog/*.md")
      .filter((item) => isPostIndexable(item.data, item.inputPath))
      .forEach((item) => {
        (item.data.tags || []).forEach((tag) => {
          const value = String(tag);
          if (!systemTags.has(value.toLowerCase())) tags.add(value);
        });
      });
    return [...tags].sort((a, b) => a.localeCompare(b, "zh-CN"));
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
  };
}
