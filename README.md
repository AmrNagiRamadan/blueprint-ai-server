# Blueprint AI Server

Vercel serverless functions used by the Techno Team / Blueprint OS app (`client/`).

| Endpoint | What it does |
| --- | --- |
| `POST /api/ai` | Proxy to OpenAI Chat Completions (key stays on the server). |
| `POST /api/search` | Web search through the OpenAI Responses API; returns verified sources. |
| `POST /api/read` | Public-page reader (`lib/reader.js`): direct fetch with a normal browser identity, then headless Chromium; uses the page description (og tags) when the page renders no text without login. Returns `status` (`read`/`unavailable`/`blocked`), `reason`, text, links and `attempts`. It never logs in. |

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | Used by `/api/ai` and `/api/search`. |
| `BLUEPRINT_TOKEN` + `READER_API_TOKEN` | recommended | Give both the same value and put it in the app: «الاتصال والبحث» → «رمز وصول سيرفر Blueprint». `/api/ai` and `/api/search` then require `X-Blueprint-Token`, `/api/read` requires `Authorization: Bearer`. Without them anyone with the URL can use your OpenAI key and the reader. |
| `ALLOWED_ORIGINS` | optional | Comma-separated CORS origins. Use `null` for the HTML file opened from disk, e.g. `null,https://my-app.example`. |
| `OPENAI_MODEL`, `OPENAI_SEARCH_MODEL` | optional | Model overrides for `/api/ai`. |

`/api/read` uses `@sparticuz/chromium` + `playwright-core`. Private/internal addresses are blocked, including redirects and sub-requests.

## App (client)

`client/Techno_Team_OS_V3_33.html` is built from `client/src/Techno_Team_OS_V3_32.html` + `client/src/v333-layer.js`:

```
npm run build:client
```

In the app, set the AI endpoint to `https://<your-project>.vercel.app/api/ai`; search and the browser reader are derived from it (`/api/search`, `/api/read`).

## Tests

```
npm install
npm test                                          # reader unit tests
CHROME_PATH=/path/to/chromium npm run test:client  # app end-to-end, all network faked
```
