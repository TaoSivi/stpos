# ST POS — handoff for the next Claude session

Read this first. It is the memory of the previous sessions (the new account will not remember them).

## Who and how to work
- Owner: TaoSivi, runs **LaoFe Cafe & Beer** (Lao). **Reply in Lao.** They send screenshots; they are not a developer, so explain what to click, step by step, and what will happen.
- Rule from the owner: **change only the part asked for, never break other features, and deploy only the changed file.** Prefer simple UI that a first-time user understands (buttons to tap, the app does the arithmetic and shows the result as a sentence).
- Never ask for, display, paste or commit passwords/tokens. Secrets live only in git-ignored files: `server/secrets.json`, `ລະຫັດ-server*.txt`, `ຊຸດປ່ຽນ-server.html`. The user types credentials themselves (e.g. the Namecheap login in the built-in browser).
- Confirm before destructive or outward-facing actions. The owner approves pushing/deploying by asking for it.
- Report outcomes honestly (what was tested, what was not, what is not yet deployed).

## What this is
- **Live app: https://stpos.store** (single file `index.html`, ~1.4 MB, vanilla JS; whole shop state is one JSON that syncs with the server).
- Source: github.com/TaoSivi/stpos, branch `main`. Local folder = this folder.
- Server (Node, `server/app.js` + `server/gas-shim.js` + `server/delta.js` + `Code.gs`): runs the original Google Apps Script merge logic on Node. Data in files under `~/stpos-data` on the host. No Google involvement any more.
- Hosting: Namecheap Stellar shared host (cPanel, `server219.web-hosting.com`, user `stpojxec`). Folders: `public_html` (the app), `stpos-api` (server), `stpos-data` (data). Node app restarted by uploading `stpos-api/tmp/restart.txt`. Cron every 10 min, daily backup 03:00 (14 kept). A VPS in Singapore is a possible later move.
- Multi-branch (done, phases 1–5): many branches on one server (`/api/<id>`), HQ page (Settings → ບ່ອນເກັບ & ສາຂາ): branch list, central menu & prices push, consolidated reports + bill archive, central staff (one user/PIN across branches), cross-branch requests/transfers (warehouse → branch). Only branch `b1` exists live; the owner has not created branch 2 yet ("ສາຂາວັງວຽງ" is currently only a stock location).

## Key design points (so you do not re-break them)
- State sync: JSONP GET + POST; delta sync (`DZ:`) with fallback to full save. Server merges concurrent devices (`mergeBills_/mergeStock_/...`). `prepIncoming` in `server/app.js` guards menu (`menuV`) and users (`usersV`) from stale devices. A reset sets `_reset` so old devices cannot bring data back.
- Login: PIN → server session token (`s1.…`). Sessions work in every branch where the same user id exists with the same PIN.
- Stock is kept in the **small unit** (g, ml, pieces); recipes cut the small unit. **Purchase units** (kg, sack, keg, case…) only affect PR/PO/GRN: ingredient fields `bu` (name), `bf` (factor to stock unit), `bspec` (what the user typed); document lines keep their own `bf`. Unit table: Settings → ຫົວໜ່ວຍ (`state.unitDefs`).
- Imports: menu+recipes Excel (one file, check screen, creates missing ingredients from names in the recipe rows), stock Excel (all sheets with `ລະຫັດ`+`ຊື່`, sets on-hand), checklist Excel. "Import everything" is hidden once a menu exists.
- Reset: Settings → ສຳຮອງ & ຂັ້ນສູງ → ລ້າງຂໍ້ມູນ: "empty shop" or sample data; needs a Super Admin PIN; auto server backup first.
- Rights: `can('action')` / `canView('page')`; per-person overrides in `user.perm`. Checklist access follows ticked rights only (owner's decision).

## How to test (do this before handing anything over)
1. `cd server && npm test` (syntax, delta, run, multiproc, branches, menu, report, users, xfer). `npm run soak` for multi-device soak.
2. Real-browser test with a **copy of the real data** on a local server (never touch live data):
   - Fetch live state read-only with the API token from `server/secrets.json` (`?gz=1&token=…`, never print the token), set test PINs in the copy (`pinHash` = same function as the app), import it into a local server: `PORT=3000 DATA_DIR=<tmp> STPOS_NO_SECRETS=1 API_TOKEN=<test> ADMIN_KEY=<test> node server/app.js`, then `POST /api?admin=import&key=<test>` (add `&force=1` to overwrite).
   - Serve `index.html` and proxy `/api*` to port 3000 on one origin (a ~15-line Node http proxy on port 8788), open it in the built-in browser, set `localStorage.stpos_api='http://localhost:8788/api'`, log in with `srvLoginKey` (set `_sl.u`, press 4 digits).
   - Stop the servers afterwards (a leftover process on port 3000 breaks the next test) and delete the temp data.
3. Check Lao text changes visually at phone width (the shop uses phones); long Lao strings and `<select>`s are the usual layout problems.

## How to deploy (only the changed file)
- App change → upload `index.html` to `public_html` (File Manager → Upload, tick **Overwrite**), then Ctrl+Shift+R on devices. Server change → also upload `server/app.js` (or the changed file) to `stpos-api` and upload a new `stpos-api/tmp/restart.txt`.
- The assistant can do it in the built-in browser after the owner logs in to Namecheap: open `https://ap.www.namecheap.com/domains/hosting/package/cpanellogin/4486048`, then call cPanel UAPI `Fileman/upload_files` from the page with files fetched from GitHub raw by commit hash. The owner often prefers to upload by hand; give the exact path and steps.
- Verify after deploy: `curl -s --compressed "https://stpos.store/?nc=$(date +%s)"` and compare with `git show <commit>:index.html` ignoring `\r`; server: `?hq=…`/`?xf=list` answer `{"ok":false,"err":"token"}` without a token.

## Pitfalls seen
- Python patch scripts with Lao text: write the script to a file (long heredocs in bash break); assert each replacement matches exactly once; watch JS string quoting after replacements (always run `node server/test/syntax.js`).
- Windows: `Remove-Item` on a variable path was blocked; use `rm -rf` in bash for temp folders.
- `curl` without `--compressed` truncates the app file.
- The built-in browser session can lose its Namecheap login; the owner must log in again.

## State at handoff (2026-10-07)
- Latest commit on `main`: **`4c9c69e`**. The live site currently serves **`c216aa4`**; the owner must upload the newest `index.html` to get: access follows ticked rights + warnings in checklist settings (4c9c69e), the earlier checklist/Import/units/stock-alert/reset work is already included in c216aa4 or after (see `git log`).
- On 2026-10-06 the owner reset the live server to an empty shop to test imports. Ingredients were restored from a pre-reset copy into `ສະຕ໋ອກ_ຄົບ_ກູ້ຄືນ_2026-10-06.xlsx` (project folder, 579 items with quantities) — import it via Stock → ⋯ → Import ສະຕ໋ອກ if stock is empty, then Import ເມນູ & ສູດ. Bills before the reset (63) are only in server backups / the pre-reset copy.
- Only two users exist live: Admin (superadmin) and Souphaphone (cashier, chkDept=Cashier; needs the "ເຮັດເຊັກລິດ" right ticked to see the checklist).
- Data points the owner should review (settings, not bugs): menu "Affogato Hot" cuts 30 straws; "ຫອຍນາງລົມ" cost 40,000/piece; "ນ້ຳມັນພືດ" loss % 80; ingredient `FING039` has no name; WS-2610-0004 (waste of 94 kg sugar) looked like a test.

## Ideas not done yet
- Telegram/push notification for the low-stock alert recipient (Telegram is already configured in the server).
- Create branch 2 (Vang Vieng) as a real branch and move its stock; the VPS move guide; UptimeRobot monitoring; WhatsApp daily report on the new server.
- Make the checklist table on narrow phones scroll less (cosmetic).
