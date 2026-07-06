package com.commercecore.orderpayment.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// Reads the Bearer access token, verifies it, and populates the Spring
// Security context with the authenticated user's id + role — so
// @AuthenticationPrincipal / SecurityContextHolder work in controllers
// exactly like they would with a "real" auth provider.
// Week 1 didn't need this (only /auth/** and /health existed, both public);
// Week 2 introduces the first protected routes (/orders, /payments).
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length());

            try {
                Claims claims = jwtUtil.parseClaims(token);

                if ("access".equals(claims.get("type", String.class))) {
                    Long userId = ((Number) claims.get("userId")).longValue();
                    String role = claims.get("role", String.class);

                    List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                    CommerceCorePrincipal principal = new CommerceCorePrincipal(userId, claims.getSubject());

                    var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception e) {
                // Invalid/expired token: leave the security context empty.
                // Spring Security's authorizeHttpRequests rules then correctly
                // reject the request as unauthenticated (401), rather than us
                // manually writing an error response here.
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
