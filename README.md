# CommerceCore — Week 1, Week 2 & Week 3

A realistically-scoped, solo-developer, polyglot microservices e-commerce platform. This README covers **Week 1 (Foundation)**, **Week 2 (Core Business Logic)**, and **Week 3 (Frontend + Integration)**: contracts, both backend services running, auth, gateway routing, product catalog, cart, the full order + mock payment flow, and now a React storefront that calls all of it.

## What's implemented

### Week 1 — Foundation

| Day | Deliverable | Status |
|-----|-------------|--------|
| D1  | OpenAPI spec for all endpoints, monorepo structure, Docker Compose skeleton | ✅ |
| D2  | Node catalog+cart-service scaffold, Mongo+Redis connections, /health | ✅ |
| D3  | Spring Boot order+payment-service scaffold, Postgres via JPA, /health | ✅ |
| D4  | Auth (signup/login/refresh) — bcrypt + JWT + refresh token table | ✅ |
| D5  | NGINX gateway routing + rate limiting | ✅ |
| D6  | Product schema + seed script (30 products) + GET /products search/filter | ✅ |
| D7  | Buffer day — README + smoke test script | ✅ |

### Week 2 — Core Business Logic

| Day | Deliverable | Status |
|-----|-------------|--------|
| D8-9  | Cart endpoints (POST/GET/DELETE /cart/items, DELETE /cart), Redis hash + TTL, stock-checked against Mongo | ✅ |
| D10-11 | Order creation (POST /orders) — Postgres transaction (order+order_items+payment), idempotency-key dedup | ✅ |
| D12   | Mock payment simulation (simulateFailure test flag), order status set accordingly | ✅ |
| D13   | GET /orders/:id/status with ownership check (403 for another user's order) | ✅ |
| D14   | Buffer + scripts/smoke-test-week2.sh end-to-end verification | ✅ |

The React frontend (Week 3) is **not implemented yet** — this is still an API-only backend, verified via curl/scripts.

### Week 3 — Frontend + Integration

| Day | Deliverable | Status |
|-----|-------------|--------|
| D15-16 | React scaffold (Vite + TS), routing (react-router-dom), Redux store (auth/cart/catalog/order slices), axios API layer with JWT interceptor + silent refresh-on-401 | ✅ |
| D17 | Product listing page — search (debounced), min/max price filter, pagination | ✅ |
| D18 | Cart UI — add/remove with optimistic updates (instant UI change, rollback on server rejection) | ✅ |
| D19 | Checkout flow UI + auth guard (ProtectedRoute) — address form, idempotency key generated client-side, test-only "simulate payment failure" toggle | ✅ |
| D20 | Order status/tracking page — fetch on load + manual refresh | ✅ |
| D21 | Buffer — CORS added to order-payment-service (the actual cross-service bug this integration surfaced; see below) | ✅ |

The frontend is a plain client for the APIs already built and verified in Weeks 1-2 — no new backend business logic was added for Week 3, only the CORS fix below, which was a genuine integration gap (Spring Security had no CORS policy at all; `catalog-cart-service` already had one via Express's `cors()` middleware since Week 1).

## A note on the cross-service order flow (read this before Week 3)

Order creation needs the user's cart, but the cart lives in Redis (Node service) while orders live in Postgres (Spring service) — two different datastores can't share one ACID transaction. This is the "biggest implementation challenge" the roadmap calls out in Section 1, and it's handled honestly rather than faked:

1. `order-payment-service` receives `POST /orders` with the user's JWT.
2. It calls `GET /cart` on `catalog-cart-service`, **forwarding the same JWT** — the two services trust the same shared secret, so the cart service authenticates the request as the same user without any special-casing.
3. Order + order_items + payment are written in a single Postgres `@Transactional` block, including idempotency-key dedup.
4. *After* that transaction commits, `order-payment-service` calls back to `catalog-cart-service` to decrement stock (a shared-secret-guarded internal endpoint, not a user-facing one) and clear the cart.

Step 4 is **not** part of the Postgres transaction — if it fails after a successful payment, today that only logs a warning server-side. That's a known, documented Month-1 simplification. The real fix (Section 27-28 / Month-2 stretch goals) is an event-driven saga: `order-service` publishes an `OrderPlaced` event, `catalog-service` consumes it and decrements stock, with a compensating action if that fails — which is exactly the Kafka/saga work this project intentionally deferred past Month 1.

## A note on CORS (Week 3 addition)

The frontend runs on its own origin (`http://localhost:5173`, Vite's default dev server port), while the gateway runs on `http://localhost:8081` — a different origin from the browser's point of view, so every cross-service call needs CORS. `catalog-cart-service` already allowed this since Week 1 (Express's `cors()` middleware in `src/index.ts`, applied globally). Spring Security in `order-payment-service` had **no** CORS configuration at all — harmless while only `curl`/scripts called it, but a browser's preflight `OPTIONS` request to `/auth`, `/orders`, or `/payments` would have been blocked before reaching a controller. `SecurityConfig.java` now registers a `CorsConfigurationSource` scoped to `FRONTEND_ORIGIN` (defaults to `http://localhost:5173`), and `.env.example` documents the new variable. If you run the frontend on a different port, update `FRONTEND_ORIGIN` to match.

## Auth model between services

Both services share one JWT secret (`JWT_SECRET`) and verify the same HS256-signed tokens — `order-payment-service` issues them, `catalog-cart-service` only verifies them. This is a Month-1-appropriate shared-secret setup; a Month-2 upgrade would move to asymmetric keys (RS256) so only the issuer holds the private key.

Service-to-service calls that aren't "on behalf of a user" (the stock decrement) use a separate shared secret (`INTERNAL_SERVICE_SECRET`) sent as a header, rather than a forwarded user token — that endpoint should never be reachable by an end user through the gateway.

## Architecture

```
React SPA (Week 3, Vite dev server, http://localhost:5173)
      |
NGINX Gateway (:8081)
   |            |
catalog+cart   order+payment
service (:4000) service (:8080)
Mongo + Redis   PostgreSQL
```

The frontend is not containerized in Month 1 (see roadmap Section 4 — Docker deployment is a Week 4 task). It runs via `npm run dev` and talks to the already-Dockerized backend through the gateway.

## Project structure

```
CommerceCore/
├── docker-compose.yml
├── .env.example
├── openapi/openapi.yaml          # full API contract (Week 1-2 implemented, Week 3-4 reserved)
├── gateway/nginx.conf            # gateway routing + rate limiting
├── scripts/
│   ├── smoke-test-week1.sh       # health, catalog search, auth flow
│   ├── smoke-test-week2.sh       # cart, order creation, payment, ownership check
│   └── smoke-test-week3.sh       # frontend reachable, CORS preflight, full click-through path
├── services/
│   ├── catalog-cart-service/     # Node.js + TypeScript, Mongo + Redis
│   └── order-payment-service/    # Spring Boot, PostgreSQL, JWT auth
└── frontend/                     # React + Redux Toolkit + Vite (Week 3, not Dockerized)
```

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ (needed to run the frontend, the seed script, or the catalog service outside Docker)
- Java 17 + Maven (only needed if running the Spring service outside Docker)

## Setup

1. Copy the environment template and fill in real secrets before running anything:

    ```bash
    cp .env.example .env
    # Edit .env — set a long random JWT_SECRET, a long random INTERNAL_SERVICE_SECRET,
    # and real DB passwords. JWT_SECRET must be identical across both services —
    # docker-compose.yml already wires the same value to both, so one edit is enough.
    ```

2. Build and start everything:

    ```bash
    docker compose up --build -d
    ```

3. Wait ~20-30 seconds for Postgres/Mongo/Redis health checks to pass, then seed sample products. Note: the seed script reads its own `.env` from inside `services/catalog-cart-service` (not the root one), so copy it there too:

    ```bash
    cd services/catalog-cart-service
    cp .env.example .env   # edit MONGO_URI to use localhost + the same credentials as root .env
    npm install
    npm run seed
    cd ../..
    ```

4. Run both smoke tests:

    ```bash
    ./scripts/smoke-test-week1.sh
    ./scripts/smoke-test-week2.sh
    ```

5. Start the frontend (separate terminal, backend from steps 1-3 must already be running):

    ```bash
    cd frontend
    cp .env.example .env   # defaults already point at the gateway on :8081
    npm install
    npm run dev
    ```

    Open [http://localhost:5173](http://localhost:5173) and click through: browse → add to cart → sign up/log in → checkout → order status.
6. Optionally run the Week 3 smoke test (frontend from step 5 must be running):

    ```bash
    ./scripts/smoke-test-week3.sh
    ```


## Verifying manually

```bash
# Gateway + service health
curl http://localhost:8081/gateway-health
curl http://localhost:8081/catalog-health
curl http://localhost:8081/order-health

# Product search
curl "http://localhost:8081/products?search=headphones&limit=5"

# Auth flow
curl -X POST http://localhost:8081/auth/signup
  -H "Content-Type: application/json"
  -d '{"email":"demo@example.com","password":"password123"}'

curl -X POST http://localhost:8081/auth/login
  -H "Content-Type: application/json"
  -d '{"email":"demo@example.com","password":"password123"}'
```

## Running services individually (without Docker)

**catalog-cart-service**

```bash
cd services/catalog-cart-service
npm install
cp .env.example .env   # point at local/dockerized Mongo+Redis; JWT_SECRET and
                        # INTERNAL_SERVICE_SECRET must match order-payment-service's
npm run dev
npm test                # 5 tests: health + JWT middleware
```

**order-payment-service**

```bash
cd services/order-payment-service
# Set JWT_SECRET, INTERNAL_SERVICE_SECRET (must match the Node service),
# and CATALOG_SERVICE_URL (e.g. http://localhost:4000 if catalog-cart-service
# is also running standalone) as environment variables, or export via your IDE run config.
mvn spring-boot:run
mvn test                # HealthControllerTest, AuthControllerTest, OrderControllerTest
                         # — all run against an isolated H2 profile, no Postgres needed
```


## What's next (Week 4)

Hardening, CI/CD, deployment, docs (Section 21, D22-30): input validation pass + rate limiting review, structured JSON logging with request-id propagation, unit tests (Jest/JUnit), GitHub Actions CI (lint → test → build), a real deployed URL (Railway/Render/EC2 per Section 26 — not AWS ECS/Terraform, which stays a documented Month-2 stretch goal), admin CRUD screens if time permits, and the final README/demo/resume-bullet polish described in Sections 28-32. None of that is implemented yet — Week 3 is purely the client for the APIs already built and verified in Weeks 1-2.