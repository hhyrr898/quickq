import { DateTime } from "luxon";

const systemTags = new Set(["all", "nav", "post", "posts", "blog"]);

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
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

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/blog/*.md").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("publicTags", (collectionApi) => {
    const tags = new Set();
    collectionApi.getFilteredByGlob("src/blog/*.md").forEach((item) => {
      (item.data.tags || []).forEach((tag) => {
        const value = String(tag);
        if (!systemTags.has(value.toLowerCase())) tags.add(value);
      });
    });
    return [...tags].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
