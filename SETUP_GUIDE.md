# Polling Unit Monitoring System — Setup Guide

## Complete System Overview

This system consists of three components:
1. **Laravel Backend API** — Authentication, data management, sync, audit logging
2. **Agent PWA** — Mobile-first offline registration app
3. **Admin Dashboard** — Desktop situation room with maps and analytics

---

## Backend Setup (Shared Hosting)

### Step 1: Create Laravel Project

If starting fresh on shared hosting with SSH access:

```bash
composer create-project laravel/laravel backend
cd backend
```

### Step 2: Install Required Packages

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

### Step 3: Copy Project Files

Copy all files from `backend/` directory into your Laravel project:
- `app/Models/*` → `app/Models/`
- `app/Http/Controllers/Api/*` → `app/Http/Controllers/Api/`
- `app/Http/Middleware/*` → `app/Http/Middleware/`
- `app/Services/*` → `app/Services/`
- `database/migrations/*` → `database/migrations/`
- `database/seeders/*` → `database/seeders/`
- `routes/api.php` → `routes/api.php`

### Step 4: Configure Environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env`:
```
APP_NAME="PU Monitoring"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_db_name
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

SANCTUM_STATEFUL_DOMAINS=your-frontend-domain.com
SESSION_DRIVER=database
SESSION_LIFETIME=120

FRONTEND_URL=https://your-frontend-domain.com
```

### Step 5: Run Migrations and Seeders

```bash
php artisan migrate --force
php artisan db:seed --force
```

### Step 6: Storage Setup

```bash
php artisan storage:link
chmod -R 775 storage
chmod -R 775 bootstrap/cache
```

### Step 7: Configure CORS

In `config/cors.php`, ensure:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['https://your-frontend-domain.com'],
'supports_credentials' => true,
```

### Step 8: Configure Sanctum

In `config/sanctum.php`, add your frontend domain to `stateful` array.

In `app/Http/Kernel.php`, ensure `EnsureFrontendRequestsAreStateful` is in the `api` middleware group.

---

## Agent PWA Setup

### Step 1: Install Dependencies

```bash
cd frontend/agent
npm install
```

### Step 2: Configure API URL

Create `.env` file:
```
VITE_API_URL=https://your-api-domain.com/api
```

### Step 3: Build

```bash
npm run build
```

### Step 4: Deploy

Upload `dist/` folder contents to your mobile subdomain (e.g., `agent.yourdomain.com`).

Ensure HTTPS is enabled for PWA functionality.

---

## Admin Dashboard Setup

### Step 1: Install Dependencies

```bash
cd frontend/admin
npm install
```

### Step 2: Configure API URL

Create `.env` file:
```
VITE_API_URL=https://your-api-domain.com/api
```

### Step 3: Build

```bash
npm run build
```

### Step 4: Deploy

Upload `dist/` folder contents to your admin subdomain (e.g., `admin.yourdomain.com`).

---

## Features Implemented

### Phase 1: Database & Authentication ✅
- [x] Complete database schema (11 tables)
- [x] Role-based user model
- [x] Secure password hashing (bcrypt)
- [x] JWT token authentication (Sanctum)
- [x] Session management
- [x] Password change
- [x] Account activation/deactivation

### Phase 2: Master Data ✅
- [x] LGA/Ward/Polling Unit hierarchy
- [x] Dummy Bauchi State data (12 LGAs, ~100 wards, ~1200 PUs)
- [x] Excel/CSV import for polling units
- [x] Validation and error reporting

### Phase 3: User Management ✅
- [x] Create/edit/deactivate users
- [x] Agent assignment to polling units
- [x] Agent reassignment with history
- [x] Role-based middleware

### Phase 4: Agent Registration ✅
- [x] Simple registration form
- [x] PVC validation (alphanumeric, ~10 chars)
- [x] Duplicate PVC warning (online)
- [x] Optional photograph capture
- [x] Auto-attach LGA/Ward/PU from agent assignment

### Phase 5: Offline-First Storage ✅
- [x] Dexie.js IndexedDB integration
- [x] Persistent local storage
- [x] Browser restart survival
- [x] Device restart survival
- [x] Sync status tracking (pending/syncing/synced/conflict/failed)

### Phase 6: Synchronization ✅
- [x] Queue-based sync engine
- [x] Client-generated UUIDs for idempotency
- [x] Exponential backoff retry
- [x] Partial sync handling
- [x] Duplicate PVC conflict detection
- [x] Conflict preservation for admin review

### Phase 7: Dashboard ✅
- [x] Summary cards (8 metrics)
- [x] Daily registration line chart
- [x] LGA performance bar chart
- [x] Completion distribution pie chart
- [x] Filter support

### Phase 8: Real-Time Updates ✅
- [x] Checksum-based polling (15s intervals)
- [x] Incremental data updates
- [x] No full page refresh required

### Phase 9: Maps ✅
- [x] Leaflet integration
- [x] Color-coded markers by status
- [x] Popup details on click
- [x] Detail panel with drill-down
- [x] Filter by status

### Phase 10: Excel Import/Export ✅
- [x] CSV import for polling units
- [x] Validation (required fields, duplicates)
- [x] CSV export for registrations
- [x] Filtered export support

### Phase 11: Audit Logging ✅
- [x] Append-only audit logs
- [x] All critical actions logged
- [x] Before/after state tracking
- [x] IP and user agent capture

### Phase 12: Security (Partial) ✅
- [x] Secure authentication
- [x] Password hashing
- [x] Role-based authorization
- [x] Server-side permission checks
- [x] Input validation
- [x] Audit logging
- [ ] Rate limiting (add to production)
- [ ] CSRF protection (Sanctum handles this)
- [ ] HTTPS enforcement (configure at server level)

---

## Testing Checklist

### Authentication
- [ ] Correct login
- [ ] Incorrect password
- [ ] Deactivated account
- [ ] Unauthorized access attempts

### Permissions
- [ ] Agent cannot access admin routes
- [ ] Coordinator sees only scoped data
- [ ] Admin sees all data

### Registration
- [ ] Valid registration
- [ ] Missing required fields
- [ ] Invalid PVC format
- [ ] Duplicate PVC (online)
- [ ] Optional photograph

### Offline
- [ ] Register without internet
- [ ] Close browser
- [ ] Reopen browser
- [ ] Restart device
- [ ] Restore internet
- [ ] Synchronize pending records

### Conflicts
- [ ] Two offline devices submit same PVC
- [ ] First sync wins
- [ ] Second becomes conflict
- [ ] Admin can resolve conflict

### Real-time
- [ ] Dashboard updates on sync
- [ ] Checksum changes trigger refresh

### Deletion
- [ ] Soft delete removes from stats
- [ ] Preserved in audit log

### Import/Export
- [ ] Valid CSV import
- [ ] Invalid CSV import
- [ ] Export filtered data
- [ ] Export all data

---

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Agent | `agent1` | `agent123` |

**⚠️ CHANGE THESE IMMEDIATELY IN PRODUCTION**

---

## Next Steps for Production

1. **Change default passwords**
2. **Enable HTTPS** on all subdomains
3. **Configure rate limiting** (Laravel Throttle middleware)
4. **Set up database backups** via hosting control panel
5. **Configure email** for password reset
6. **Add reCAPTCHA** to login page
7. **Review and harden CORS** settings
8. **Set up error monitoring** (Sentry or similar)
9. **Test on target Android devices**
10. **Train agents** on offline workflow

---

## Support

For issues or questions, refer to:
- `README.md` — Project overview
- `sample_polling_units.csv` — Import template
- Laravel documentation: https://laravel.com/docs
- React documentation: https://react.dev
