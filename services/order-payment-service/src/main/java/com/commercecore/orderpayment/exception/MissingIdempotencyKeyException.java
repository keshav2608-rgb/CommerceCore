package com.commercecore.orderpayment.exception;

public class MissingIdempotencyKeyException extends RuntimeException {
    public MissingIdempotencyKeyException() {
        super("Idempotency-Key header is required for order creation");
    }
}
