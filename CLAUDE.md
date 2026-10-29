# Börek Time — handoff for Claude Code

Read this first. It is everything the previous Claude Code sessions knew about this project:
what exists, how to run and deploy it, the server, and what the owner likes and dislikes.
`README.md` has the user-facing feature list; `backend/CLAUDE.md` is Laravel Boost boilerplate.

## The project in one paragraph

Bilingual (English / Arabic, full RTL) digital menu + table booking for **Börek Time — Restaurant & Cafe
since 2020** (Jordan, prices in JD). Laravel 13 API + React 19 app, one Docker container, live at
**https://borektime.com** (old address borektime.codak-tech.com redirects there) on the owner's Google Cloud VM. Guests scan a table QR code →
`/welcome` → **Menu** or **Book a table**. Staff manage everything at `/admin`.

- Repo: https://github.com/anoudshaban/boriktime (GitHub user `anoudshaban`). **The repo is public — never commit
  passwords, `.env` files, keys or server secrets.**
- Branch: `main`. Commit and push after every finished task; end commit messages with the Co-Authored-By line
  your harness asks for.

## Working with the owner

- Writes short, informal English (sometimes typos); also reads Arabic. Answer simply, no jargon; give links and
  exact clicks. They usually say "do all the work" — do it end to end: change → test → screenshot-check →
  **commit, push and deploy** → tell them the link to look at.
- They judge by looking at the live site on a phone. Always check pages at **phone width (390px)** and in Arabic.
- Ask before anything costly or outward-facing (paid services, DNS, touching other sites on the server).

### Design rules (direction A "Stone & Wine" — chosen by the owner after many rounds)

Calm stone background `#ecebe6`, deep wine `#5a1214` cards, gold hairlines `#a67c33`, Cormorant Garamond / Jost
(Amiri / Tajawal in Arabic). Dish **photos** are plain, still rectangles with soft corners (`.dshot`), and the
pop-up shows the **whole photo uncropped** — the owner rejected round/turning photos (27-10-2026). Dishes without a
photo show a still porcelain plate drawing (no turning). A dish opens as a **pop-up**
(bottom sheet on phones), never a separate page. Styles: `frontend/src/menu/stone.css`, `reserve.css`.

The owner explicitly **rejected** (do not bring back): dark theme, crossed/marquee text bands, arched or curved
photo frames, very large photos, muddy colour glows, flashy/“gimmick” effects, full-page product view, floating
bubbles. Subtle motion is welcome; noise is not.

## Code map

```
backend/                      Laravel 13, PHP 8.4, SQLite, Sanctum tokens
  config/menu.php             sections (slugs, Arabic names, icons), home groups (kitchen/cafe/sweets),
                              featured dishes, tags, default settings (incl. booking hours)
  app/Support/
    MenuCache.php             cached public menu (key menu.public.v3.<date>, file cache) — flush after DB edits
    MenuSync.php              applies database/data/menu.json (the current price list) + clearPhotos()
    MenuImporter.php          Excel import (FINAL Menu.xlsx layout), XlsxMenuReader.php parses it
    ReservationRules.php      booking slots/notice/days-ahead, timezone Asia/Amman
    ImageStore.php            uploads → WebP
  app/Http/Controllers/Api/   MenuController (public /api/menu), ReservationController (public POST),
                              AuthController, Admin/* (categories, products, offers, settings, import, reservations)
  routes/api.php, routes/console.php (artisan menu:* commands), routes/web.php (SPA fallback)
  database/data/menu.json     ← latest price list (FINAL menu 26-10-2026). Edit this to change names/prices.
  database/data/menu.xlsx     original spreadsheet (seeder imports it, then applies menu.json)
  tests/Feature/              36 tests — run `php artisan test`
frontend/                     React 19 + TS + Vite, motion/react, react-router 7
  src/menu/                   public site: MenuApp (routes), Home, GroupPage, DishView (pop-up), Gate (/welcome),
                              Reserve (/reserve), Offers, SearchOverlay, MyListSheet, parts.tsx (DishPlate, Price)
  src/admin/                  Dashboard (has reservations panel), ReservationsPage (+ booking settings),
                              QrPage, ProductsPage/ProductEditor, PhotosPage, OffersPage, CategoriesPage,
                              SettingsPage, ImportPage, AccountPage, Layout (sidebar, new-booking chime/badge)
  src/lib/i18n.tsx            all UI strings EN/AR — add both languages for every new string
  vite build → backend/public/app (committed, served by Laravel)
deploy/                       Dockerfile, docker-compose.yml, nginx-borektime.conf, deploy.sh
```

Public routes: `/` menu home, `/menu/:group`, `/menu/:group/:dish` (pop-up), `/offers/:id`, `/welcome` (QR
landing), `/reserve`. Admin: `/admin/*`. API: `/api/menu`, `POST /api/reservations` (throttle 10/min, honeypot
field `website`), `/api/auth/*`, `/api/admin/*` (Bearer token).

Settings are a key/value table of strings (`Setting::allWithDefaults()` merges `config('menu.default_settings')`)
and are sent to the public menu, e.g. `reservations_enabled` "1"/"0", `reservation_open` "12:00",
`reservation_last` "23:00", `reservation_interval` "30", `reservation_max_guests` "20".

## Common jobs

- **New price list / menu changes:** edit `backend/database/data/menu.json` (matched by English name, since the
  owner's lists renumber dishes; for a renamed dish add `"was": "Old Name"` so it keeps its tags/photo; dishes missing
  from the file get hidden, not deleted). Before deploying, try it on a copy of the live database
  (`docker exec borektime-app cat storage/app/database.sqlite` → `DB_DATABASE=<copy> php artisan menu:sync`). Locally
  `php artisan menu:sync`; after deploying, run it on the server:
  `sudo docker exec borektime-app php artisan menu:sync`. Admins can also edit single dishes in Admin → Dishes.
- **Photos:** none on the live site right now (owner asked to remove them). Owner uploads real ones in
  Admin → Photos. `php artisan menu:clear-photos` wipes all photos/banners/videos/offer images. The admin's
  `ImageDrop` shrinks photos in the browser (max 2000px, WebP) before upload; the server allows 20 MB
  (`ImageStore::RULES`) and refuses files GD can't decode (iPhone HEIC) with a plain message.
- **Booking hours** etc.: Admin → Reservations → Booking settings (stored as settings above).
- **QR code:** Admin → QR code (PNG/SVG/print card) — uses the address the admin is open on, i.e. `https://borektime.com/welcome` (old printed codes still work via the redirect).

## Run locally

PHP 8.4 (pdo_sqlite, gd, intl, zip, mbstring, fileinfo), Composer, Node 20+. The owner's PC has PHP 8.3 (WAMP), which
Composer refuses; a portable PHP 8.4 zip from windows.php.net (enable those extensions in php.ini) works for tests.

```bash
cd backend && composer install && cp .env.example .env && php artisan key:generate
php artisan migrate --seed && php artisan storage:link && php artisan serve      # :8000
cd frontend && npm install && npm run dev                                         # :5173, proxies /api
```

Local admin login comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env` (seeded).

Checking the UI: headless Chrome `--window-size` can't go below ~500px, so phone screenshots need the DevTools
protocol (`Emulation.setDeviceMetricsOverride` width 390, mobile true). Store the language with
`localStorage.bt_lang = 'ar'`; the admin token lives in `localStorage.bt_admin_token`.

Windows/Git Bash gotchas seen here: `sed`/heredocs strip backslashes in PHP namespaces and regexes (use the
Edit tool), `tar` needs `/c/...` paths not `C:/...`, Python is not installed (use Node for scripts).

## Production

| | |
|---|---|
| URL | https://borektime.com (admin: `/admin`) |
| Server | Google Cloud VM **codak-prod**, IP `34.18.197.141`, project `project-ec4579f5-343c-418f-bea`, zone `me-central1-a` |
| Google account | codaktech93@gmail.com — the project uses **OS Login**, so SSH user is `codaktech93_gmail_com` |
| App | `/srv/borektime` (`backend/`, `deploy/`), container `borektime-app` (serversideup/php:8.4-fpm-nginx, port 8080) |
| Data | Docker volume `deploy_storage` → `/var/www/html/storage` (SQLite at `storage/app/database.sqlite`, uploads) |
| Secrets | `/srv/borektime/deploy/.env.production` on the server only (never in git) |
| DNS | Hostinger: `borektime.com` A `@` → 34.18.197.141, `www` CNAME → borektime.com; old `borektime` A record on codak-tech.com kept for the redirect |

**The VM is shared with the owner's other sites** (codak-tech.com, codigoo-tech.com, api.codigoo-tech.com — the
`codak-prod` Docker stack in `/srv/codak`). Don't restart or edit their containers. After any nginx change, check
those still answer.

- **Reverse proxy:** the existing container `codak-prod-nginx-1` serves everything. Its config template is
  `/srv/codak/infra/nginx/prod.conf.template`; the Börek Time server blocks (copy of `deploy/nginx-borektime.conf`)
  are pasted in it, marked by the comment `# ---- Börek Time menu`. To change it: back up the template, edit,
  re-render inside the container with `/docker-entrypoint.d/20-envsubst-on-templates.sh`, `nginx -t`, then
  `nginx -s reload` (restore the backup if the test fails). Backups exist as `prod.conf.template.bak-2026…`.
  **Gotcha:** the template is a single-file, read-only bind mount. `sed -i` / editors that replace the file give it a
  new inode, so the running container keeps seeing the old copy (that happened on 29-10-2026, so it is stale now).
  Either edit in place (`cat new > template`), or render the host template inside the container with
  `envsubst` (vars `${SITE_DOMAIN} ${API_DOMAIN} ${MEDIA_DOMAIN}` only) into `/etc/nginx/conf.d/default.conf`,
  `nginx -t`, reload. A restart of that container re-renders from the host file, which is up to date.
- **HTTPS:** Let's Encrypt certs in `/srv/codak/infra/letsencrypt` (webroot `/srv/codak/infra/certbot-webroot`):
  `borektime.com` (+www), `borektime.codak-tech.com` (only for the redirect), codak-tech.com, codigoo-tech.com.
  Auto-renewal for all: `/etc/cron.d/letsencrypt-renew` (Mondays 03:17, log `/var/log/letsencrypt-renew.log`).
- codak-tech.com itself redirects to codigoo-tech.com and shows the codigoo certificate (owner's change, Sept 2026,
  not ours).

### Getting deploy access on a new computer

1. Install the Google Cloud SDK, then `gcloud auth login` with codaktech93@gmail.com and
   `gcloud config set project project-ec4579f5-343c-418f-bea`.
2. `ssh-keygen -t ed25519 -f ~/.ssh/borektime_deploy -N ""`
3. `gcloud compute os-login ssh-keys add --key-file ~/.ssh/borektime_deploy.pub`
4. Test: `ssh -i ~/.ssh/borektime_deploy codaktech93_gmail_com@34.18.197.141 'sudo docker ps'`

### Deploying

```bash
SSH_USER=codaktech93_gmail_com SSH_KEY=~/.ssh/borektime_deploy bash deploy/deploy.sh
```

Builds the frontend, uploads `backend/` + `deploy/`, rebuilds the container, migrates, caches config/routes/views,
flushes the menu cache and checks the main URLs return 200. **Never run `db:seed` or `migrate:fresh` in
production** — it holds the real menu edits, reservations and the admin account. Run one-off commands with
`sudo docker exec borektime-app php artisan …`.

Production admin username is `admin` (password: ask the owner — not stored in the repo). The `ADMIN_*` values in
`.env.production` are only used by the seeder and are out of date; don't reseed.

## State on 26-10-2026 and open ideas

Done and live: menu updated to "FINAL menu 26-10-2026" (68 dishes, 67 shown; Zaatar Pie and Akkawi & Zaatar Pie
added; 8 dropped dishes hidden; Fatteh Yalanji / Fattet Maqdous moved into Hot Mezzah so the Fatteh tab no longer
shows; Hardal steak replaces Fattet Mozat as a featured dish; Breakfast is "coming later" per the PDF, so it has
`"available": false` in menu.json and the Kitchen subtitle on live no longer mentions breakfast — when it starts,
remove that line, run menu:sync, and restore the subtitle in Admin → Categories), all photos removed, QR welcome page, table booking, admin reservations (dashboard panel, chime +
badge + tab title for new requests, confirm/arrived/cancel, staff notes), QR code page.

Not done / ideas the owner may ask for:
- Booking alerts when no one has the dashboard open. WhatsApp declined for now (official API is paid per message,
  unofficial libraries risk a ban). Free options offered: Telegram bot, email.
- Restaurant info still empty: phone, WhatsApp, address, map link, opening hours (Admin → Restaurant info).
- Booking hours are a guess (12:00–23:00, every 30 min, max 20 guests) — the owner should set real ones.
- Real food photos.
- The admin password the owner chose is weak; suggest changing it in Admin → Account.
