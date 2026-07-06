#!/usr/bin/env bash
# Manual verification script for Week 2 deliverables: cart + order/payment flow.
# Run after Week 1's smoke test passes and `npm run seed` has been run at least once.
set -euo pipefail

GATEWAY="http://localhost:8081"
EMAIL="week2-demo-$(date +%s)@example.com"

echo "== Signup a fresh user for this run =="
SIGNUP_RESPONSE=$(curl -sf -X POST "$GATEWAY/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}")
ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Got access token."

echo -e "\n== Find a product to add to cart =="
PRODUCT_ID=$(curl -sf "$GATEWAY/products?limit=1" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Using product: $PRODUCT_ID"

echo -e "\n== Add item to cart =="
curl -sf -X POST "$GATEWAY/cart/items" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}"

echo -e "\n\n== View cart =="
curl -sf "$GATEWAY/cart" -H "Authorization: Bearer $ACCESS_TOKEN"

echo -e "\n\n== Create order (should succeed — mock payment defaults to success) =="
ORDER_RESPONSE=$(curl -sf -X POST "$GATEWAY/orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-key-$(date +%s)" \
  -d '{"addressLine1":"123 Main St","city":"Patna","postalCode":"800001"}')
echo "$ORDER_RESPONSE"
ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

echo -e "\n== Check order status (should be PAID) =="
curl -sf "$GATEWAY/orders/$ORDER_ID/status" -H "Authorization: Bearer $ACCESS_TOKEN"

echo -e "\n\n== Cart should now be empty (cleared after successful order) =="
curl -sf "$GATEWAY/cart" -H "Authorization: Bearer $ACCESS_TOKEN"

echo -e "\n\n== Confirm order ownership check: a different user cannot view this order =="
OTHER_EMAIL="week2-demo-other-$(date +%s)@example.com"
OTHER_SIGNUP=$(curl -sf -X POST "$GATEWAY/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$OTHER_EMAIL\",\"password\":\"password123\"}")
OTHER_TOKEN=$(echo "$OTHER_SIGNUP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

set +e
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/orders/$ORDER_ID/status" -H "Authorization: Bearer $OTHER_TOKEN")
set -e
if [ "$HTTP_STATUS" == "403" ]; then
  echo "Correctly forbidden (403) — ownership check works."
else
  echo "UNEXPECTED status: $HTTP_STATUS (expected 403)"
  exit 1
fi

echo -e "\n\nAll Week 2 smoke checks passed."
