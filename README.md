# Polling Unit Monitoring & Situation Room System

A secure, responsive, offline-first web application for monitoring registration activity across polling units in Bauchi State, Nigeria.

## Architecture

- **Backend**: PHP 8.2+ / Laravel 11 / MySQL 8.0+
- **Agent Frontend**: React 18 + Vite + PWA + Dexie.js (IndexedDB)
- **Admin Frontend**: React 18 + Vite + Recharts + Leaflet
- **Real-time**: Optimized HTTP polling (checksum-based) for shared hosting

## Features

### Agent PWA (Mobile)
- Offline-first registration with IndexedDB persistence
- Automatic background synchronization
- PVC duplicate detection (online + offline)
- Camera photo capture (optional)
- Sync status tracking (pending/synced/conflict)
- 24+ hour offline capability

### Admin Dashboard (Desktop)
- Real-time situation room with summary cards
- Interactive charts (daily trends, LGA/ward performance, completion distribution)
- Leaflet map with polling unit markers (color-coded by status)
- Drill-down navigation (State → LGA → Ward → PU → Agent)
- Search & filter registrations
- Excel export (CSV format)
- Excel import for polling unit master data
- Sync conflict resolution
- Audit logs (append-only)
- Role-based access control

## User Roles

| Role | Scope |
|------|-------|
| **Central Administrator** | Full system access |
| **LGA Coordinator** | View assigned LGA only |
| **Ward Coordinator** | View assigned ward only |
| **Polling Unit Agent** | Own polling unit only |

## Installation

### Backend (Shared Hosting)

1. Upload files to your hosting directory
2. Copy `.env.example` to `.env` and configure database
3. Run migrations and seeders:
   ```bash
   php artisan migrate --force
   php artisan db:seed --force
   ```
4. Create storage symlink:
   ```bash
   php artisan storage:link
   ```
5. Set permissions:
   ```bash
   chmod -R 775 storage bootstrap/cache
   ```

### Agent PWA

```bash
cd frontend/agent
npm install
npm run build
# Upload dist/ to your mobile subdomain
```

### Admin Dashboard

```bash
cd frontend/admin
npm install
npm run build
# Upload dist/ to your admin subdomain
```

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Agent | `agent1` | `agent123` |

**⚠️ Change these immediately in production.**

## API Endpoints

### Authentication
- `POST /api/login` — Login
- `POST /api/logout` — Logout
- `GET /api/me` — Current user
- `POST /api/change-password` — Change password

### Agent
- `GET /api/agent/dashboard` — Agent dashboard data
- `GET /api/agent/records` — My records
- `POST /api/agent/register` — Register person (offline storage)
- `POST /api/sync/push` — Push pending records
- `GET /api/sync/status` — Check sync status

### Dashboard
- `GET /api/dashboard/summary` — Summary statistics
- `GET /api/dashboard/checksum` — Status checksum (for polling)
- `GET /api/dashboard/daily` — Daily registration stats
- `GET /api/dashboard/lgas` — LGA performance
- `GET /api/dashboard/wards` — Ward performance
- `GET /api/dashboard/agents` — Agent performance
- `GET /api/dashboard/completion` — Completion distribution

### Registrations
- `GET /api/registrations` — List registrations
- `GET /api/registrations/{id}` — View registration
- `GET /api/search?q={query}` — Search PVC/name/phone
- `PUT /api/registrations/{id}` — Edit registration (admin)
- `DELETE /api/registrations/{id}` — Soft delete (admin)

### Map
- `GET /api/map/polling-units` — List PUs with coordinates
- `GET /api/map/polling-units/{id}` — PU detail

### Import/Export
- `POST /api/import/polling-units` — Import from CSV
- `GET /api/export/registrations` — Export to CSV

### Admin
- `GET /api/users` — List users
- `POST /api/users` — Create user
- `POST /api/users/{id}/assign` — Assign agent to PU
- `POST /api/users/{id}/reassign` — Reassign agent
- `POST /api/users/{id}/deactivate` — Deactivate user
- `GET /api/audit-logs` — View audit logs
- `GET /api/sync-conflicts` — View sync conflicts
- `POST /api/sync-conflicts/{id}/resolve` — Resolve conflict

## CSV Import Format

```csv
lga,ward,polling_unit_code,polling_unit_name,polling_unit_location,latitude,longitude
Bauchi,Ward 01,BA-01-WD01-PU001,PU 001,Near Central Mosque,10.3158,9.8442
Bauchi,Ward 01,BA-01-WD01-PU002,PU 002,Market Square,10.3165,9.8450
```

## Environment Variables

```env
APP_NAME="PU Monitoring"
APP_ENV=production
APP_KEY= # php artisan key:generate
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_db
DB_USERNAME=your_user
DB_PASSWORD=your_pass

SANCTUM_STATEFUL_DOMAINS=your-frontend-domain.com
SESSION_DRIVER=database
SESSION_LIFETIME=120

FRONTEND_URL=https://your-frontend-domain.com
```

## Security

- Password hashing with bcrypt
- JWT token authentication (Laravel Sanctum)
- Role-based access control (server-side enforced)
- Input validation on all endpoints
- Audit logging for all critical actions
- Soft deletes for data recovery
- HTTPS required in production

## License

Proprietary — Bauchi State Government
