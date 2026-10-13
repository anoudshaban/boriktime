# Börek Time — Digital Menu

Bilingual (English / العربية) digital menu for **Börek Time — Restaurant & Cafe since 2020**, with an admin panel to manage dishes, prices and photos.

- **Backend:** Laravel 13 (PHP 8.3+) — REST API, Sanctum token auth, SQLite by default (MySQL ready)
- **Frontend:** React 19 + TypeScript + Vite, animations with [Motion](https://motion.dev)

```
boriktime/
├── backend/    Laravel API + serves the built React app from public/app
└── frontend/   React source (menu + /admin panel)
```

## What guests get

- Animated intro: the logo draws itself, then the curtain lifts (once per visit, tap to skip)
- Hero with swaying wheat, drifting flour particles and scroll parallax
- Sticky category bar with icons and scroll-spy; the active section slides into view
- **Chef's picks** carousel
- Cards with 3D tilt, light sheen and scroll-reveal; or a classic **list view** with dotted price leaders
- Dish detail sheet: drag down to close on phones, modal on desktop, next/previous, share link (`/#dish-12`)
- Instant search across English and Arabic (`borek` finds “Börek”, Arabic spelling variants match)
- Full Arabic mode: RTL layout, Arabic fonts and Arabic-Indic numerals
- Works offline with the last menu seen, and respects “reduce motion”

Dishes without a photo get a designed placeholder (burgundy plate + section icon + menu number) until you upload one.

## Admin panel — `/admin`

| | |
|---|---|
| Dishes | Inline price edit, show/hide, Chef's pick, reorder, photos (auto-resized to WebP), tags, descriptions |
| Sections | Names, taglines, icon, order, visibility |
| Restaurant info | Phone, WhatsApp, Instagram, address, map link, opening hours, currency |
| Import Excel | Upload a new version of `FINAL Menu.xlsx` to update names and prices in bulk (photos and edits are kept) |

Default login (set in `backend/.env` **before** seeding, then change it):

```
ADMIN_EMAIL=admin@borektime.com
ADMIN_PASSWORD=BorekTime@2020
```

## Run it locally

Requirements: PHP 8.3+ (extensions: pdo_sqlite, gd, zip, mbstring, fileinfo), Composer, Node 20+.

```bash
# 1. API
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed      # creates the admin user and imports the menu
php artisan storage:link
php artisan serve               # http://127.0.0.1:8000

# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173  (proxies /api to Laravel)
```

### Production build

```bash
cd frontend && npm run build    # outputs to backend/public/app
```

Laravel then serves the whole site: `/` is the menu, `/admin` the panel, `/api/*` the API. Point the web server's document root to `backend/public`.

On the server:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan db:seed --force     # first deploy only
php artisan storage:link
php artisan config:cache && php artisan route:cache
```

To use MySQL, set `DB_CONNECTION=mysql` and the `DB_*` values in `backend/.env`.

## Updating the menu from Excel

Keep the spreadsheet layout (`#`, `Item`, `الصنف`, `Final Price`). A row with only a title starts a new section. Then either upload it in **Admin → Import Excel**, or:

```bash
php artisan menu:import "path/to/FINAL Menu.xlsx"            # update in place
php artisan menu:import "path/to/menu.xlsx" --hide-missing   # also hide removed dishes
php artisan menu:import --fresh                               # wipe and re-import
```

Arabic section names, icons and taglines for the spreadsheet's sections live in `backend/config/menu.php`.

## API

| Method | Endpoint | |
|---|---|---|
| GET | `/api/menu` | Full public menu (cached, ETag) |
| POST | `/api/auth/login` | `{email, password}` → `{token}` |
| GET/POST/PUT/DELETE | `/api/admin/categories`, `/api/admin/products` | Bearer token |
| POST/DELETE | `/api/admin/{categories,products}/{id}/image` | Photo upload |
| POST | `/api/admin/{categories,products}/reorder` | `{ids: [...]}` |
| GET/PUT | `/api/admin/settings` | Restaurant info |
| POST | `/api/admin/import` | Excel upload |

## Tests

```bash
cd backend && php artisan test
```
