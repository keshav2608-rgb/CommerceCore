package com.commercecore.orderpayment.controller;

import com.commercecore.orderpayment.dto.CartItemDto;
import com.commercecore.orderpayment.dto.CartResponseDto;
import com.commercecore.orderpayment.entity.User;
import com.commercecore.orderpayment.repository.UserRepository;
import com.commercecore.orderpayment.security.JwtUtil;
import com.commercecore.orderpayment.service.CatalogServiceClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Exercises the full order-creation flow against an in-memory H2 database.
// CatalogServiceClient (the cross-service HTTP call to catalog-cart-service)
// is mocked here — this test verifies OUR transactional/idempotency/ownership
// logic, not the network call itself. The real cross-service path is what
// scripts/smoke-test-week1.sh (extended for Week 2) exercises against live
// Docker containers.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @MockBean
    private CatalogServiceClient catalogServiceClient;

    private String accessToken;
    private Long userId;

    @BeforeEach
    void setUp() {
                String email = "order-test-user-" + UUID.randomUUID() + "@example.com";

        User user = new User();
                user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setRole("CUSTOMER");
        user = userRepository.save(user);
        userId = user.getId();

        accessToken = jwtUtil.generateAccessToken(user.getEmail(), user.getId(), user.getRole());

        CartResponseDto cart = new CartResponseDto(
                String.valueOf(userId),
                List.of(new CartItemDto("prod-1", "Test Product", BigDecimal.valueOf(19.99), 2, 10)),
                BigDecimal.valueOf(39.98)
        );
        when(catalogServiceClient.getCart(anyString())).thenReturn(cart);
        doNothing().when(catalogServiceClient).decrementStock(any());
        doNothing().when(catalogServiceClient).clearCart(anyString());
    }

    @Test
    void createOrder_withoutIdempotencyKey_returnsBadRequest() throws Exception {
        String body = objectMapper.writeValueAsString(
                new java.util.HashMap<>() {{
                    put("addressLine1", "123 Main St");
                    put("city", "Patna");
                    put("postalCode", "800001");
                }}
        );

        mockMvc.perform(post("/orders")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("MissingIdempotencyKey"));
    }

    @Test
    void createOrder_succeeds_andIsIdempotentOnRetry() throws Exception {
        String body = objectMapper.writeValueAsString(
                new java.util.HashMap<>() {{
                    put("addressLine1", "123 Main St");
                    put("city", "Patna");
                    put("postalCode", "800001");
                }}
        );

        String firstResponse = mockMvc.perform(post("/orders")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("Idempotency-Key", "test-key-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.total").value(39.98))
                .andReturn().getResponse().getContentAsString();

        // Retry with the same Idempotency-Key must return the SAME order, not create a new one.
        String secondResponse = mockMvc.perform(post("/orders")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("Idempotency-Key", "test-key-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        assertEqualsIgnoringWhitespace(firstResponse, secondResponse);
    }

    @Test
    void createOrder_withSimulateFailure_marksOrderFailed() throws Exception {
        String body = objectMapper.writeValueAsString(
                new java.util.HashMap<>() {{
                    put("addressLine1", "123 Main St");
                    put("city", "Patna");
                    put("postalCode", "800001");
                }}
        );

        mockMvc.perform(post("/orders")
                        .param("simulateFailure", "true")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("Idempotency-Key", "test-key-fail-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("FAILED"));
    }

    @Test
    void getOrderStatus_forSomeoneElsesOrder_returnsForbidden() throws Exception {
        String body = objectMapper.writeValueAsString(
                new java.util.HashMap<>() {{
                    put("addressLine1", "123 Main St");
                    put("city", "Patna");
                    put("postalCode", "800001");
                }}
        );

        String created = mockMvc.perform(post("/orders")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("Idempotency-Key", "test-key-2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long orderId = objectMapper.readTree(created).get("id").asLong();

        User otherUser = new User();
        otherUser.setEmail("someone-else@example.com");
        otherUser.setPasswordHash(passwordEncoder.encode("password123"));
        otherUser.setRole("CUSTOMER");
        otherUser = userRepository.save(otherUser);
        String otherAccessToken = jwtUtil.generateAccessToken(
                otherUser.getEmail(), otherUser.getId(), otherUser.getRole()
        );

        mockMvc.perform(get("/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + otherAccessToken))
                .andExpect(status().isForbidden());
    }

    private void assertEqualsIgnoringWhitespace(String expected, String actual) {
        org.junit.jupiter.api.Assertions.assertEquals(expected.trim(), actual.trim());
    }
}
