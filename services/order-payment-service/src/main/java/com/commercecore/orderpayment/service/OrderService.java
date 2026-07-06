package com.commercecore.orderpayment.service;

import com.commercecore.orderpayment.dto.*;
import com.commercecore.orderpayment.entity.*;
import com.commercecore.orderpayment.exception.EmptyCartException;
import com.commercecore.orderpayment.exception.ForbiddenOrderAccessException;
import com.commercecore.orderpayment.exception.OrderNotFoundException;
import com.commercecore.orderpayment.repository.OrderRepository;
import com.commercecore.orderpayment.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

// Owns order creation and status lookup (Section 8 user flow / D10-13).
//
// IMPORTANT scoping note (see roadmap Section 27-28 "Risks" and the Month-2
// stretch goals): the Postgres write (order + order_items + payment) is a
// single ACID transaction, but the follow-up calls to catalog-cart-service
// (decrement stock, clear cart) happen AFTER that transaction commits and are
// NOT part of it — Postgres and MongoDB can't share a transaction. If the
// decrement-stock call fails after a successful payment, today this only
// logs a warning; the honest Month-2 fix is an event-driven saga (order-service
// publishes OrderPlaced, catalog-service consumes it and decrements stock,
// with a compensating action if it fails) rather than a synchronous call.
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final CatalogServiceClient catalogServiceClient;

    public OrderService(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            CatalogServiceClient catalogServiceClient
    ) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.catalogServiceClient = catalogServiceClient;
    }

    @Transactional
    public OrderResponse createOrder(
            Long userId,
            CreateOrderRequest request,
            String idempotencyKey,
            String bearerToken,
            boolean simulateFailure
    ) {
        // Idempotent retry: if this key was already used, return the original
        // order instead of creating a duplicate (Section 5-6 edge case).
        var existingPayment = paymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existingPayment.isPresent()) {
            Order existingOrder = existingPayment.get().getOrder();
            return OrderResponse.from(existingOrder);
        }

        CartResponseDto cart = catalogServiceClient.getCart(bearerToken);
        if (cart.items() == null || cart.items().isEmpty()) {
            throw new EmptyCartException();
        }

        Order order = new Order();
        order.setUserId(userId);
        order.setAddressLine1(request.addressLine1());
        order.setCity(request.city());
        order.setPostalCode(request.postalCode());

        BigDecimal total = BigDecimal.ZERO;
        for (CartItemDto item : cart.items()) {
            OrderItem orderItem = new OrderItem();
            orderItem.setProductId(item.productId());
            orderItem.setQuantity(item.quantity());
            orderItem.setPrice(item.price());
            order.addItem(orderItem);
            total = total.add(item.price().multiply(BigDecimal.valueOf(item.quantity())));
        }
        order.setTotal(total);

        // Mock payment (Section 18/8): the `simulateFailure` flag exists purely
        // so the failure path (Section 8: "payment mock fails -> order marked
        // FAILED, stock not decremented") is actually exercisable in tests/demo,
        // without needing a real payment gateway sandbox in Month 1.
        boolean paymentSucceeded = !simulateFailure;
        order.setStatus(paymentSucceeded ? OrderStatus.PAID : OrderStatus.FAILED);

        Order savedOrder = orderRepository.save(order);

        Payment payment = new Payment();
        payment.setOrder(savedOrder);
        payment.setIdempotencyKey(idempotencyKey);
        payment.setStatus(paymentSucceeded ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED);
        paymentRepository.save(payment);

        if (paymentSucceeded) {
            List<DecrementStockRequest.Item> items = cart.items().stream()
                    .map(i -> new DecrementStockRequest.Item(i.productId(), i.quantity()))
                    .toList();
            try {
                catalogServiceClient.decrementStock(new DecrementStockRequest(items));
                catalogServiceClient.clearCart(bearerToken);
            } catch (Exception e) {
                // See class-level note: this is the known Month-1 gap. We don't
                // roll back the Postgres transaction for a downstream Mongo call
                // failing — that would mean charging nobody but also selling
                // stock we don't have, which is worse. Logged for visibility;
                // reconciliation is a Month-2 concern.
                System.err.println("WARNING: order " + savedOrder.getId()
                        + " paid but stock decrement/cart clear failed: " + e.getMessage());
            }
        }

        return OrderResponse.from(savedOrder);
    }

    public OrderStatusResponse getOrderStatus(Long orderId, Long requestingUserId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (!order.getUserId().equals(requestingUserId)) {
            throw new ForbiddenOrderAccessException();
        }

        return new OrderStatusResponse(order.getId(), order.getStatus().name());
    }
}
