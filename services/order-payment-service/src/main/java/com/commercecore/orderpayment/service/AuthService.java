package com.commercecore.orderpayment.service;

import com.commercecore.orderpayment.dto.*;
import com.commercecore.orderpayment.entity.RefreshToken;
import com.commercecore.orderpayment.entity.User;
import com.commercecore.orderpayment.exception.DuplicateEmailException;
import com.commercecore.orderpayment.exception.InvalidCredentialsException;
import com.commercecore.orderpayment.exception.InvalidRefreshTokenException;
import com.commercecore.orderpayment.repository.RefreshTokenRepository;
import com.commercecore.orderpayment.repository.UserRepository;
import com.commercecore.orderpayment.security.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

// Owns all signup/login/refresh business logic (Section 12 "auth module").
// Kept in one place per-service since Month 1 doesn't warrant its own microservice for auth.
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException(request.email());
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole("CUSTOMER");
        userRepository.save(user);

        return issueTokenPair(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        return issueTokenPair(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token not recognized"));

        if (stored.isRevoked() || stored.getExpiryDate().isBefore(Instant.now())) {
            throw new InvalidRefreshTokenException("Refresh token expired or revoked");
        }

        if (!jwtUtil.isTokenValid(stored.getToken())) {
            throw new InvalidRefreshTokenException("Refresh token signature invalid");
        }

        // Rotate: revoke the old refresh token and issue a brand new pair.
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokenPair(stored.getUser());
    }

    private AuthResponse issueTokenPair(User user) {
        String accessToken = jwtUtil.generateAccessToken(user.getEmail(), user.getId(), user.getRole());
        String refreshTokenValue = jwtUtil.generateRefreshToken(user.getEmail(), user.getId());

        Claims refreshClaims = jwtUtil.parseClaims(refreshTokenValue);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(refreshTokenValue);
        refreshToken.setExpiryDate(refreshClaims.getExpiration().toInstant());
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.of(accessToken, refreshTokenValue, jwtUtil.getAccessTokenExpiryMs());
    }
}
