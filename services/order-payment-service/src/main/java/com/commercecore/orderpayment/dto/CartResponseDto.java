package com.commercecore.orderpayment.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartResponseDto(
        String userId,
        List<CartItemDto> items,
        BigDecimal subtotal
) {}
