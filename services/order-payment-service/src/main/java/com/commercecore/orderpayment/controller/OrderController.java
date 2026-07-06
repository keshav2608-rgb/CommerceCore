package com.commercecore.orderpayment.controller;

import com.commercecore.orderpayment.dto.CreateOrderRequest;
import com.commercecore.orderpayment.dto.OrderResponse;
import com.commercecore.orderpayment.dto.OrderStatusResponse;
import com.commercecore.orderpayment.exception.MissingIdempotencyKeyException;
import com.commercecore.orderpayment.security.CommerceCorePrincipal;
import com.commercecore.orderpayment.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> createOrder(
            @AuthenticationPrincipal CommerceCorePrincipal principal,
            @Valid @RequestBody CreateOrderRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader("Authorization") String authorizationHeader,
            // Test-only hook so the mock payment failure path (Section 8) is
            // actually reachable without a real payment gateway sandbox.
            @RequestParam(value = "simulateFailure", defaultValue = "false") boolean simulateFailure
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException();
        }

        OrderResponse response = orderService.createOrder(
                principal.userId(), request, idempotencyKey, authorizationHeader, simulateFailure
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/orders/{id}/status")
    public ResponseEntity<OrderStatusResponse> getOrderStatus(
            @AuthenticationPrincipal CommerceCorePrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(orderService.getOrderStatus(id, principal.userId()));
    }
}
