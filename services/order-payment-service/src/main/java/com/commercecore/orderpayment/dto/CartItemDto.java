package com.commercecore.orderpayment.dto;

import java.math.BigDecimal;

// Mirrors the hydrated cart item shape returned by catalog-cart-service's GET /cart.
public record CartItemDto(
        String productId,
        String name,
        BigDecimal price,
        int quantity,
        int stock
) {}
