# Techno Team research focus V3.34

The root index.html serves the initial research workflow only: presence, platform examination, differences, latest observed content sample, improvement discussion, and missing questions. Campaign planning and execution are not in the active UI.

app.js and style.css are the readable sources; index.html embeds both and Cairo fonts from the previous client version. Keep the root and this index in sync when building.

The existing /api/read, /api/search and /api/ai routes are reused without changing provider secrets or models. Protected AI/search routes use X-Blueprint-Token; reader uses its configured Bearer token.

Data uses a separate localStorage and IndexedDB namespace. Legacy clients are imported with complete original records retained under legacy. No writes go to the old client namespace. JSON backup and HTML client reports are importable without replacing current clients. No credentials enter the backups.

Content ratios count only reviewed, dated posts with matching quotations and observed direct URLs, grouped by platform, capped at 30 latest observed posts. Partial reads are explicitly labelled. Missing evidence never means no content. Identity candidates require review.

Tests: Chromium end-to-end flow with deterministic API fixtures verified migration, source identity, nonfatal reads, address/market separation, differences, old content sample and denominator, discussion, question suppression, report restore, persistence and mobile width. Additional live reader/OpenAI extraction on LDC accepted six facts with matching quotations and rejected two unmatched quotations; it was not a comprehensive live test of every platform.
