package com.budgetplanner.auth.service;

import com.budgetplanner.auth.dto.AccessTokenResponse;
import com.budgetplanner.auth.entity.UserAccessToken;
import com.budgetplanner.auth.repository.UserAccessTokenRepository;
import com.budgetplanner.auth.security.AuthProperties;
import com.budgetplanner.auth.util.TokenUtils;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AccessTokenService {
    private final EntityManager entityManager;
    private final UserAccessTokenRepository tokens;
    private final AuthProperties properties;
    private final Clock clock;

    @Transactional
    public AccessTokenResponse issue(Long userId) {
        String token = TokenUtils.generate();
        Instant expiresAt = clock.instant().plus(properties.accessTokenTtl());
        entityManager.persist(new UserAccessToken(TokenUtils.hash(token), userId, expiresAt));
        return new AccessTokenResponse(token, "Bearer", expiresAt);
    }

    @Scheduled(fixedDelayString = "${app.auth.cleanup-interval:PT1H}")
    @Transactional
    public void removeExpiredTokens() {
        tokens.deleteExpired(clock.instant());
    }
}
