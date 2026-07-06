package com.commercecore.orderpayment.service;

import com.commercecore.orderpayment.dto.CartResponseDto;
import com.commercecore.orderpayment.dto.DecrementStockRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

// Encapsulates every cross-service HTTP call to catalog-cart-service.
// This is the concrete, honest version of the "biggest implementation
// challenge" called out in Section 1 of the roadmap: two independently
// deployable services, in two languages, that must agree on a JWT contract
// and a small internal API surface.
@Component
public class CatalogServiceClient {

    private final RestClient restClient;
    private final String internalServiceSecret;

    public CatalogServiceClient(
            RestClient catalogServiceRestClient,
            @Value("${app.internal.service-secret}") String internalServiceSecret
    ) {
        this.restClient = catalogServiceRestClient;
        this.internalServiceSecret = internalServiceSecret;
    }

    /**
     * Fetches the caller's cart, forwarding their original bearer token so
     * catalog-cart-service's own JWT middleware authenticates the same user
     * — we never re-mint or bypass auth for this internal call.
     */
    public CartResponseDto getCart(String bearerToken) {
        return restClient.get()
                .uri("/cart")
                .header("Authorization", bearerToken)
                .retrieve()
                .body(CartResponseDto.class);
    }

    /**
     * Clears the caller's cart after a successful order — same forwarded-token
     * approach as getCart.
     */
    public void clearCart(String bearerToken) {
        restClient.delete()
                .uri("/cart")
                .header("Authorization", bearerToken)
                .retrieve()
                .toBodilessEntity();
    }

    /**
     * Decrements stock for the items in a paid order. This is a genuine
     * internal/service-to-service call (not on behalf of any specific end
     * user), so it's authorized with the shared internal secret instead of
     * a forwarded user token.
     */
    public void decrementStock(DecrementStockRequest request) {
        restClient.post()
                .uri("/products/decrement-stock")
                .header("X-Internal-Service-Secret", internalServiceSecret)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }
}
