# AWS Route 53 Clone

A full-stack clone of the AWS Route 53 console. It has real accounts, hosted zones and DNS records, live health checks that probe your endpoints, a DNS "Test record" resolver, and a CloudShell terminal that runs `aws route53` commands against your data. The UI recreates the Route 53 console look using the same design system AWS uses. It does not serve DNS on port 53 to the internet.

| | |
|---|---|
| **Live app** | https://scaler-aws-route-53-clone.vercel.app/ |

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

Interactive documentation: https://route53-clone-api-775i.onrender.com/api/docs

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


## What is simulated

Billing and IAM are simplified: each account has one user, and the Free plan credits are display-only. Alias records, non-simple routing policies, DNSSEC, tags, domain registration, traffic flow and Resolver are disabled or marked "Coming soon". DNS answers are available through Test record and the CloudShell CLI, not on port 53.
