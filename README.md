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

A calm, typographic menu in three steps:

1. **Home** (`/`) — the logo draws itself on the first visit, a short welcome text, then one large card per group: *The Kitchen*, *The Café*, *Sweets*.
2. **Group page** (`/menu/kitchen`) — sticky pill tabs for its sections (Breakfast, Bakery…) that follow your scroll, gold section headings and dish cards.
3. **Dish quick view** (`/menu/kitchen/12`) — large photo, description, price, calories and “You may also like”. Every dish has its own shareable link.

Also: instant search in English and Arabic (`borek` finds “Börek”), full Arabic mode (RTL, Arabic fonts and numerals), offline copy of the last menu, and “reduce motion” support.

Dishes without a photo show a porcelain plate, tilted in 3D and slowly turning, with the section's motif — until you upload a photo in the admin. **Real photos make the biggest difference to how the menu looks.**

## Admin panel — `/admin`

| | |
|---|---|
| Dishes | Inline price edit, show/hide, Chef's pick, reorder, photos (auto-resized to WebP), tags, descriptions |
| Sections | Groups (home cards) and their sections: names, descriptions, icon, group, order, visibility |
| Restaurant info | Welcome text & motto, phone, WhatsApp, Instagram, address, map link, opening hours, currency |
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

Arabic section names, icons, taglines and the home-page groups live in `backend/config/menu.php`.

## Starter photos

`backend/database/data/photos` holds openly licensed photos from Wikimedia Commons (one per dish, by menu number, plus section banners). `php artisan db:seed` attaches them, or run:

```bash
php artisan menu:photos            # only fills dishes/sections without a photo
php artisan menu:photos --force    # replace everything with the starter photos
```

They are stand-ins, not photos of Börek Time dishes. Each one's author and licence (CC BY / CC BY-SA require credit) is in `credits.json`, shown under the photo and in **Photo credits** on the menu. Uploading your own photo in Admin → Photos replaces it and removes the credit.

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

## QR code & table booking

- The table QR code opens **`/welcome`**: the logo and two choices, **Menu** (`/`) and **Book a table** (`/reserve`).
- Guests pick party size, date, time, an optional occasion and special requests; the booking arrives as a *new request*.
- Staff handle bookings in **Admin → Reservations** (confirm, mark arrived, cancel, staff note). Booking hours, time steps,
  maximum party size and an on/off switch are at the bottom of that page.
- **Admin → QR code** downloads the code (PNG / SVG) and prints a table card.
