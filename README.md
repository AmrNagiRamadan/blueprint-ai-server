# Blueprint AI Server

Vercel serverless functions used by the Techno Team / Blueprint OS app (`client/`).

| Endpoint | What it does |
| --- | --- |
| `POST /api/ai` | Proxy to OpenAI Chat Completions (key stays on the server). |
| `POST /api/search` | Web search through the OpenAI Responses API; returns verified sources. |
| `POST /api/read` | Headless Chromium reader: loads a page, closes dismissible login/cookie dialogs, returns text + links (+ HTML). Reports `loginWall: true` when a wall cannot be closed — it never logs in. |

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | Used by `/api/ai` and `/api/search`. |
| `BLUEPRINT_TOKEN` | recommended | When set, every request must send `X-Blueprint-Token`. Put the same value in the app: «الاتصال والبحث» → «رمز وصول سيرفر Blueprint». Without it anyone with the URL can use your OpenAI key and the browser reader. |
| `ALLOWED_ORIGINS` | optional | Comma-separated CORS origins. Use `null` for the HTML file opened from disk, e.g. `null,https://my-app.example`. |
| `OPENAI_MODEL`, `OPENAI_SEARCH_MODEL` | optional | Model overrides for `/api/ai`. |

`/api/read` uses `@sparticuz/chromium` + `puppeteer-core` (Node 22). Private/internal addresses are blocked, including redirects and sub-requests.

## App (client)

`client/Techno_Team_OS_V3_33.html` is built from `client/src/Techno_Team_OS_V3_32.html` + `client/src/v333-layer.js`:

```
npm run build:client
```

In the app, set the AI endpoint to `https://<your-project>.vercel.app/api/ai`; search and the browser reader are derived from it (`/api/search`, `/api/read`).

## Tests

```
npm install
CHROME_PATH=/path/to/chromium npm test          # /api/read against local fixture pages
CHROME_PATH=/path/to/chromium npm run test:client  # app end-to-end, all network faked
```
