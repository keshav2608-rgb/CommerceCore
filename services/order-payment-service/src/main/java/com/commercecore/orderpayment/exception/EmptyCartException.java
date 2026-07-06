package com.commercecore.orderpayment.exception;

public class EmptyCartException extends RuntimeException {
    public EmptyCartException() {
        super("Cannot place an order with an empty cart");
    }
}
