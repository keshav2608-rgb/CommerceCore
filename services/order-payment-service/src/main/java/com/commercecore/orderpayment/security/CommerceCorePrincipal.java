package com.commercecore.orderpayment.security;

// Minimal authenticated-principal record placed in the SecurityContext by
// JwtAuthenticationFilter — controllers read the userId off this to enforce
// ownership checks (e.g. "you can only view your own order").
public record CommerceCorePrincipal(Long userId, String email) {
}
