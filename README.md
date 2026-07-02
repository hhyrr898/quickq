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
