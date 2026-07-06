package com.commercecore.orderpayment.exception;

public class ForbiddenOrderAccessException extends RuntimeException {
    public ForbiddenOrderAccessException() {
        super("This order does not belong to the requesting user");
    }
}
