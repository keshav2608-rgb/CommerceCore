#!/usr/bin/env bash
# Manual verification script for Week 1 deliverables.
# Run this after `docker compose up --build -d` (give services ~20-30s to boot).
set -euo pipefail

GATEWAY="http://localhost:8081"

echo "== Gateway health =="
curl -sf "$GATEWAY/gateway-health" | tee /dev/stderr | grep -q '"status":"UP"' && echo "OK"

echo -e "\n== Catalog+cart service health (via gateway) =="
curl -sf "$GATEWAY/catalog-health" | tee /dev/stderr | grep -q '"status":"UP"' && echo "OK"

echo -e "\n== Order+payment service health (via gateway) =="
curl -sf "$GATEWAY/order-health" | tee /dev/stderr | grep -q '"status":"UP"' && echo "OK"

echo -e "\n== Product listing (after running npm run seed inside catalog-cart-service) =="
curl -sf "$GATEWAY/products?limit=3" | tee /dev/stderr

echo -e "\n== Auth: signup =="
SIGNUP_RESPONSE=$(curl -sf -X POST "$GATEWAY/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.user@example.com","password":"password123"}')
echo "$SIGNUP_RESPONSE"
REFRESH_TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

echo -e "\n== Auth: login =="
curl -sf -X POST "$GATEWAY/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.user@example.com","password":"password123"}'

echo -e "\n\n== Auth: refresh =="
curl -sf -X POST "$GATEWAY/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"

echo -e "\n\nAll Week 1 smoke checks passed."
