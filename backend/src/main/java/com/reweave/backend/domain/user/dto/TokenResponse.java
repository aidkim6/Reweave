package com.reweave.backend.domain.user.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        long accessTokenExpiresIn
) {
}