package com.commercecore.orderpayment.dto;

import java.util.List;

public record DecrementStockRequest(List<Item> items) {
    public record Item(String productId, int quantity) {}
}
