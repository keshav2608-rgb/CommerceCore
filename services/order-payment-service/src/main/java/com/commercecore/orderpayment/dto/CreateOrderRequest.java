package com.commercecore.orderpayment.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateOrderRequest(
        @NotBlank String addressLine1,
        @NotBlank String city,
        @NotBlank String postalCode
) {}
