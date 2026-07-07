#!/usr/bin/env bash
# Manual verification script for Week 3 deliverables: the frontend can
# actually reach every API surface it depends on through the gateway, and
# the CORS configuration added for Week 3 is in place.
# Run after `docker compose up --build -d` (backend) AND `npm run dev`
# (frontend, in a separate terminal, from services/../frontend).
set -euo pipefail

GATEWAY="http://localhost:8081"
FRONTEND="http://localhost:5173"

echo "== Frontend dev server is serving the SPA shell =="
curl -sf "$FRONTEND" | grep -q '<div id="root">' && echo "OK"

echo -e "\n== CORS preflight: order-payment-service allows the frontend origin =="
PREFLIGHT_HEADERS=$(curl -s -o /dev/null -D - -X OPTIONS "$GATEWAY/auth/login" \
  -H "Origin: $FRONTEND" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type")
echo "$PREFLIGHT_HEADERS" | grep -qi "access-control-allow-origin: $FRONTEND" && echo "OK"

echo -e "\n== CORS preflight: catalog-cart-service allows the frontend origin =="
curl -s -o /dev/null -D - -X OPTIONS "$GATEWAY/cart/items" \
  -H "Origin: $FRONTEND" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  | grep -qi "access-control-allow-origin" && echo "OK"

echo -e "\n== Full click-through path is reachable (same calls the UI itself makes) =="
EMAIL="week3-demo-$(date +%s)@example.com"
SIGNUP_RESPONSE=$(curl -sf -X POST "$GATEWAY/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}")
ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

PRODUCT_ID=$(curl -sf "$GATEWAY/products?limit=1" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

curl -sf -X POST "$GATEWAY/cart/items" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}" > /dev/null
echo "Added to cart — OK"

ORDER_RESPONSE=$(curl -sf -X POST "$GATEWAY/orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: week3-demo-$(date +%s)" \
  -d '{"addressLine1":"123 Main St","city":"Patna","postalCode":"800001"}')
ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Created order $ORDER_ID — OK"

curl -sf "$GATEWAY/orders/$ORDER_ID/status" -H "Authorization: Bearer $ACCESS_TOKEN" | grep -q '"status"' && echo "Order status reachable — OK"

echo -e "\nAll Week 3 smoke checks passed. Open $FRONTEND in a browser to click through manually."
