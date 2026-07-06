# quickq Pages Site

Eleventy static site for GitHub Pages or Cloudflare Pages.

## Local Run

```bash
npm install
npm run dev
```

Build output is written to `_site/`.

## Cloudflare Pages

Use these build settings:

- Build command: `npm run build`
- Build output directory: `_site`

The repository includes `wrangler.toml` with `pages_build_output_dir = "_site"`.

## Repository Variables And Secrets

Set these values before enabling the article workflow:

- `GEMINI_API_KEY`: Gemini API key.
- `INDEXNOW_KEY`: Bing Webmaster → **IndexNow** 生成的 key（与下方 API Key 不同）；部署后需可访问 `https://quickq-cn.com/{key}.txt`。
- `BING_SITE_AUTH`: Bing XML 验证文件中的 user 字符串（可选）。
- `BING_API_KEY`: Bing Webmaster → **Settings → API Access** 生成的 API Key（用于 `push:bing:*`）；须与已验证站点 `quickq-cn.com` 绑定。
- `SITE_URL`: public site origin, such as `https://quickq-cn.com`.

若 `BING_API_KEY` 过期或填错，工作流会跳过 SubmitUrlbatch 并继续；收录主要依赖 IndexNow（`INDEXNOW_KEY`）。

The manual workflow can create 1 to 9 articles in one run. Choose `updated` for new pages only, or `all` for the first full submission.

## Search engine notification

每次推送到 `main` 后，`notify-search-engines` 工作流会：

1. 构建站点并等待 Cloudflare Pages 部署（约 90 秒）
2. 通过 IndexNow 推送所有可索引 URL（需 `INDEXNOW_KEY`）
3. 通过 Bing SubmitUrlbatch 提交 sitemap 中的 URL（需 `BING_API_KEY`，可选）

也可在 GitHub Actions 中手动运行 **Notify search engines**。

## Cloudflare www 重定向（GSC canonical 修复）

`_redirects` 已处理 `/download.html`、`/dows.html` 旧链接。`www` → 主域需在 Cloudflare 控制台补充一条规则：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)，选择 `quickq-cn.com`
2. 进入 **规则 → 重定向规则 → 创建规则**
3. 配置：
   - **规则名称**：`www to apex`
   - **表达式**：`(http.host eq "www.quickq-cn.com")`
   - **类型**：动态重定向
   - **URL**：`concat("https://quickq-cn.com", http.request.uri.path)`
   - **状态码**：`301`
4. 保存并部署

同时确认 **Workers & Pages → quickq 项目 → 自定义域** 中 `quickq-cn.com` 与 `www.quickq-cn.com` 均已绑定。

完成后在 Google Search Console 对「重复网页，Google 选择了不同的规范网址」点 **验证修复**。
