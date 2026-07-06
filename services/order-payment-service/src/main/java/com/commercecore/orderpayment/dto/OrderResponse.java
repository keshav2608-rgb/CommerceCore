package com.commercecore.orderpayment.dto;

import com.commercecore.orderpayment.entity.Order;

import java.math.BigDecimal;

public record OrderResponse(
        Long id,
        String status,
        BigDecimal total
) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getId(), order.getStatus().name(), order.getTotal());
    }
}
