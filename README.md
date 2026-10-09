# Route 53 Clone

A working clone of the AWS Route 53 console, built with Next.js, FastAPI and SQLite. It has real accounts, hosted zones and DNS records, live health checks that probe your endpoints, a DNS "Test record" resolver, and a CloudShell terminal that runs `aws route53` commands against your data. It recreates the Route 53 look (dark AWS palette, top bar, side navigation, footer). It does not serve DNS on port 53 to the internet.

**Live demo:** _add your Vercel URL here_ · **API docs:** `<backend-url>/api/docs`

![Route 53 landing page](docs/screenshots/landing.png)

## Features

**Console shell**

- AWS top bar: logo, Route 53 service icon, services menu, global search (`Alt+S`) across pages, zones, records and health checks, a CloudShell button, a notifications bell with unread badge, help, and the account menu.
- Account menu: account alias, Free plan status (credits and days remaining), links to account, security credentials, sessions and profile, language, visual mode (browser default, light, dark), and sign out.
- Footer: CloudShell, Feedback (stored in the database), language, privacy, terms and cookie links.
- Dark mode is the default and uses the AWS console palette. Light mode and browser default are one click away.

**Pages**

- **Landing page** (`/`): Route 53 intro, Get started, pricing, resources, How it works, products, benefits and use cases.
- **Dashboard**: resource counters, service cards, records-by-type chart, health status chart and recent activity.
- **Hosted zones**: list, search, filter, paginate, create (public or private), view, edit, delete and bulk delete.
- **Records**: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV and CAA with per-type validation and Route 53 rules (no duplicates, no CNAME at the apex or beside other records, protected apex NS/SOA). Create several at once, edit, delete, bulk delete, and attach a health check.
- **Test record**: asks the zone what Route 53 would answer for a name and type, following wildcards and CNAME chains, and returns NOERROR or NXDOMAIN.
- **Health checks**: HTTP, HTTPS and TCP checks with an IP address or domain name, port, path, optional string matching, 10 or 30 second interval, failure threshold, invert and disable. A background checker probes every endpoint on its interval. The details page shows status and latency charts and the result history, with Check now, Enable/Disable, Edit and Delete.
- **Profile**: account details (name, email, alias), plan and credits, change password (signs out other sessions), active sessions with sign-out, and visual mode.
- **Sign up and sign in**: anyone can create an account (its own 12-digit account ID); each account only sees its own data.
- Placeholder "Coming soon" pages for Profiles, Traffic policies, Domains, Resolver and DNS Firewall.

**Extras**

- **CloudShell**: a terminal in the footer that runs a subset of the AWS CLI (`aws route53 list-hosted-zones`, `create-hosted-zone`, `change-resource-record-sets`, `test-dns-answer`, `create-health-check`, `get-health-check-status` and more; type `help`). Output is AWS-style JSON.
- **Import and export**: BIND zone file import with preview, export as BIND or JSON.
- **Notifications**: every change and every health status flip is logged and shown in the bell drawer.
- **Keyboard shortcuts** (press `?`): `Alt+S` search, `Alt+T` CloudShell, `Alt+M` visual mode, `g` then `h/d/z/c/p` to go home, dashboard, zones, checks or profile, `c` to create, `/` to filter.

| Dashboard | Health check |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Health check](docs/screenshots/healthcheck-details.png) |
| **CloudShell** | **Test record** |
| ![CloudShell](docs/screenshots/cloudshell.png) | ![Test record](docs/screenshots/test-record.png) |
| **Account menu** | **Profile** |
| ![Account menu](docs/screenshots/account-menu.png) | ![Profile](docs/screenshots/profile.png) |

## Setup

Requirements: Python 3.11+ and Node.js 20+. 

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

On first start the API creates `backend/route53.db` with all tables. Interactive API docs are at http://localhost:8000/api/docs. Run the tests with `pytest`.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///backend/route53.db` | SQLite file location. Use an absolute path on servers, e.g. `sqlite:////var/data/route53.db` |
| `SEED_ON_STARTUP` | `true` | `true` creates a demo account (`123456789012` / `demo` / `demo1234`) with three sample zones |
| `ALLOW_SIGNUP` | `true` | Allow new accounts from the sign-up page |
| `HEALTH_CHECKER_ENABLED` | `true` | Run the background health checker |
| `ALLOW_PRIVATE_HEALTH_CHECK_TARGETS` | `false` | Allow checks against private or loopback IPs (useful locally; keep off on a public server) |
| `SESSION_TTL_HOURS` | `72` | Session lifetime |
| `COOKIE_SECURE` | `false` | Set `true` in production (HTTPS) |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

### Frontend

```bash
cd frontend
cp .env.example .env.local         # BACKEND_URL=http://localhost:8000
npm install
npm run dev
```

Open http://localhost:3000, choose **Create a new account**, and you are in.

## Deployment

**Backend on Render.** In Render choose **New + → Blueprint** and pick this repository; `render.yaml` sets everything up. Set `CORS_ORIGINS` to your Vercel URL when prompted.

- Render's free plan has no persistent disk, so the SQLite file is wiped on every redeploy or restart. That is why the blueprint sets `SEED_ON_STARTUP=true`: reviewers always have a demo account. For data that survives, use a paid instance, uncomment the `disk` block in `render.yaml`, set `DATABASE_URL=sqlite:////var/data/route53.db`, and set `SEED_ON_STARTUP=false` if you don't want the demo account.
- Free instances sleep when idle, so the first request after a while is slow and health checks pause while asleep.

**Frontend on Vercel.** Import the repository, set **Root Directory** to `frontend`, and add `BACKEND_URL=https://<your-service>.onrender.com`.

## Architecture

```
Browser ──► Next.js (Vercel) ──/api/* rewrite──► FastAPI (Render) ──► SQLite
             App Router + Cloudscape                routes → controllers → services → SQLAlchemy models
                                                    background health checker (asyncio + httpx)
```

- `/api/*` is proxied through a Next.js rewrite, so the session cookie is first-party.
- `middleware.ts` sends visitors without a session to `/login`; the API checks the token on every request.
- The UI uses [Cloudscape](https://cloudscape.design), the design system the AWS console uses, plus a custom top bar, footer and CloudShell matching the console.
- The zones and records service layers (`modules/zones/service.py`, `modules/records/service.py`) back both the REST API and the CloudShell CLI, so both apply the same validation and write the same activity log.
- The health checker runs inside the API process. Each probe is an HTTP(S) GET or a TCP connect with a 4 second connect and 2 second read timeout; 2xx and 3xx count as healthy. Targets that resolve to private addresses are refused unless explicitly allowed.
- New columns are added to an existing SQLite file automatically on startup, so upgrading keeps your data.

```
backend/app/
  main.py, seed.py
  core/      config, db, errors, dns_rules, schemas (Page, bulk delete), timeutil
  modules/   one package per domain, each with models, schemas, service, controller and routes:
             auth (+ security), zones (+ exporter), records (+ resolver, zonefile),
             healthchecks (+ probe, checker), activity, dashboard, search, feedback,
             cli (+ parser, serializers, commands)
frontend/src/
  app/login, app/signup
  app/(console)/  page.tsx (landing), dashboard, hostedzones/..., healthchecks/..., profile, [...section]
  components/     console-layout, shell/ (top bar, search, account menu, CloudShell, footer, drawers,
                  shortcuts), record and health check forms, tables, modals
  lib/            API client, query hooks, DNS helpers, types, nav
```

## Database schema

```
users (id, username, password_hash, account_id UNIQUE, account_alias UNIQUE, display_name, email, created_at)
sessions (token PK, user_id → users, created_at, expires_at)
hosted_zones (id PK, owner_id → users, name, is_private, comment, caller_reference, vpc_region, vpc_id, ...)
record_sets (id, zone_id → hosted_zones, name, type, ttl, routing_policy, health_check_id → health_checks
             ON DELETE SET NULL, ..., UNIQUE(zone_id, name, type))
record_values (id, record_set_id → record_sets, value, position)
health_checks (id PK, owner_id → users, name, protocol, ip_address, domain_name, port, resource_path,
               search_string, request_interval, failure_threshold, inverted, disabled, status,
               consecutive_failures, consecutive_successes, last_checked_at, last_latency_ms, last_message, ...)
health_check_results (id, health_check_id → health_checks, checked_at, success, latency_ms, status_code, message)
activity (id, owner_id → users, action, resource_type, resource_id, message, created_at)
feedback (id, owner_id → users, rating, message, page, created_at)
```

Deletes cascade from users to everything they own, and from zones to records. Only the latest 500 results are kept per health check.

## API overview

All endpoints are under `/api`. Apart from login, register, config and health, they need the session cookie.

| Method | Path | Description |
|---|---|---|
| GET | `/auth/config` | Whether sign-up and the demo account are enabled |
| POST | `/auth/register` | Create an account and sign in |
| POST | `/auth/login` / `/auth/logout` | Sign in (`account_id` or alias, `username`, `password`) / out |
| GET, PATCH | `/auth/me` | Current user / update name, email, alias |
| POST | `/auth/change-password` | Change password and sign out other sessions |
| GET, DELETE | `/auth/sessions`, `/auth/sessions/{id}` | List or revoke sessions |
| GET, POST | `/hostedzones` | List (`search`, `type`, `page`, `page_size`) / create |
| GET, PATCH, DELETE | `/hostedzones/{id}` | Zone details / update comment / delete |
| POST | `/hostedzones/bulk-delete` | Delete several zones |
| GET | `/hostedzones/{id}/export?format=bind\|json` | Download the zone |
| GET | `/hostedzones/{id}/test-dns?name=&type=` | Test record |
| GET, POST | `/hostedzones/{id}/records` | List / create (`name`, `type`, `ttl`, `values`, `health_check_id`) |
| GET, PATCH, DELETE | `/hostedzones/{id}/records/{rid}` | Record details / update / delete |
| POST | `/hostedzones/{id}/records/bulk-delete`, `/records/import` | Bulk delete / import a BIND file |
| GET, POST | `/healthchecks` | List (`search`, `status`, paging) / create (runs the first check right away) |
| GET, PATCH, DELETE | `/healthchecks/{id}` | Details / update / delete |
| POST | `/healthchecks/{id}/check` | Check now |
| GET | `/healthchecks/{id}/results` | Recent probe results |
| POST | `/healthchecks/bulk-delete` | Delete several health checks |
| GET | `/dashboard`, `/activity`, `/search?q=` | Dashboard data, activity log, global search |
| POST | `/cli` | Run a CloudShell command (`{ "command": "aws route53 ..." }`) |
| POST | `/feedback` | Send feedback |
| GET | `/health` | Service health |

Errors look like `{ "detail": "...", "code": "NoSuchHostedZone" }`.

## What is simulated

Billing and IAM are simplified: each account has one user, and the Free plan credits are display-only. Alias records, non-simple routing policies, DNSSEC, tags, domain registration, traffic flow and Resolver are disabled or "Coming soon". DNS answers are available through Test record and the CLI, not on port 53.
