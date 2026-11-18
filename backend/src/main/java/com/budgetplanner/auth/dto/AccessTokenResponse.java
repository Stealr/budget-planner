package com.budgetplanner.auth.dto;

import java.time.Instant;

public record AccessTokenResponse(String accessToken, String tokenType, Instant expiresAt) {
    @Override
    public String toString() {
        return "AccessTokenResponse[tokenType=" + tokenType + ", expiresAt=" + expiresAt + "]";
    }
}
