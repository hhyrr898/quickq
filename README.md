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
- `BING_API_KEY`: Bing Webmaster API key.
- `SITE_URL`: public site origin, such as `https://quickq-cn.com`.

The manual workflow can create 1 to 9 articles in one run. Choose `updated` for new pages only, or `all` for the first full submission.
