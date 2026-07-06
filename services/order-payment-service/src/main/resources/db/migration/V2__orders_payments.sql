-- Week 2 (D10-13): orders, order_items, payments — per Section 12-16 schema.

CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | PAID | FAILED
    total       NUMERIC(12,2) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    city           VARCHAR(120) NOT NULL,
    postal_code    VARCHAR(20) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  VARCHAR(64) NOT NULL, -- Mongo ObjectId string — no FK across datastores
    quantity    INTEGER NOT NULL,
    price       NUMERIC(12,2) NOT NULL
);

CREATE TABLE payments (
    id               BIGSERIAL PRIMARY KEY,
    order_id         BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status           VARCHAR(20) NOT NULL, -- SUCCEEDED | FAILED
    idempotency_key  VARCHAR(255) NOT NULL UNIQUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_payments_idempotency_key ON payments(idempotency_key);
