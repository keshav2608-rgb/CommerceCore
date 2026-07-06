# CommerceCore — Week 1

A realistically-scoped, solo-developer, polyglot microservices e-commerce platform.
This README covers **Week 1 only** (Foundation): contracts, scaffolding, both
services booting, auth, gateway routing, and product catalog + search.

See the original roadmap for full project scope, Week 2-4 plans, and the reasoning
behind cutting Kafka/saga/ECS/Prometheus from Month 1.

## What's implemented in Week 1

| Day | Deliverable | Status |
|-----|-------------|--------|
| D1  | OpenAPI spec for all endpoints, monorepo structure, Docker Compose skeleton | ✅ |
| D2  | Node catalog+cart-service scaffold, Mongo+Redis connections, `/health` | ✅ |
| D3  | Spring Boot order+payment-service scaffold, Postgres via JPA, `/health` | ✅ |
| D4  | Auth (signup/login/refresh) — bcrypt + JWT + refresh token table | ✅ |
| D5  | NGINX gateway routing + JWT-aware structure + rate limiting | ✅ |
| D6  | Product schema + seed script (30 products) + `GET /products` search/filter | ✅ |
| D7  | Buffer day — this README + smoke test script | ✅ |

Cart, order/payment business logic, and the React frontend are **Week 2+** and are
intentionally not implemented yet — see `openapi/openapi.yaml` for their reserved
contracts.

## Architecture

```
React SPA (Week 3)
      |
NGINX Gateway (:8081)
   |            |
catalog+cart   order+payment
service (:4000) service (:8080)
Mongo + Redis   PostgreSQL
```

## Project structure

```
CommerceCore/
├── docker-compose.yml
├── .env.example
├── openapi/openapi.yaml          # full API contract (Week 1-4)
├── gateway/nginx.conf            # gateway routing + rate limiting
├── scripts/smoke-test-week1.sh   # manual end-to-end verification
└── services/
    ├── catalog-cart-service/     # Node.js + TypeScript, Mongo + Redis
    └── order-payment-service/    # Spring Boot, PostgreSQL, JWT auth
```

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ (only needed if running the catalog service outside Docker, or to run the seed script)
- Java 17 + Maven (only needed if running the Spring service outside Docker)

## Setup

1. Copy the environment template and fill in real secrets before running anything:
   ```bash
   cp .env.example .env
   # Edit .env — set a long random JWT_SECRET and real DB passwords
   ```
2. Build and start everything:
   ```bash
   docker compose up --build -d
   ```
3. Wait ~20-30 seconds for Postgres/Mongo/Redis health checks to pass, then seed sample products:
   ```bash
   cd services/catalog-cart-service
   npm install
   npm run seed
   cd ../..
   ```
4. Run the smoke test:
   ```bash
   ./scripts/smoke-test-week1.sh
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
curl -X POST http://localhost:8081/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'

curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'
```

## Running services individually (without Docker)

**catalog-cart-service**
```bash
cd services/catalog-cart-service
npm install
cp .env.example .env   # point at local/dockerized Mongo+Redis
npm run dev
npm test
```

**order-payment-service**
```bash
cd services/order-payment-service
mvn spring-boot:run
mvn test
```

## Git workflow

`main` is always deployable. Create a feature branch per module and use
conventional commits, e.g.:

```bash
git init
git add .
git commit -m "chore: scaffold monorepo, docker-compose, openapi spec (D1)"
git checkout -b feat/catalog-cart-health
git commit -m "feat(catalog-cart-service): mongo+redis health check (D2)"
git checkout main && git merge feat/catalog-cart-health
```

## What's next (Week 2)

Cart endpoints (Redis, TTL), order creation with Postgres transactions + idempotency
keys, mock payment logic, and order status tracking. Not started yet — see
`openapi/openapi.yaml` for the reserved `/cart`, `/orders`, `/payments` contracts.
