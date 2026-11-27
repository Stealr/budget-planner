package com.budgetplanner.auth.service;
import com.budgetplanner.auth.entity.UserAccessToken;
import com.budgetplanner.auth.repository.UserAccessTokenRepository;
import com.budgetplanner.auth.security.AuthProperties;
import com.budgetplanner.auth.util.TokenUtils;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import java.time.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class AccessTokenServiceTest {
    @Test void storesOnlyHashWithConfiguredExpirationAndCleansExpiredTokens() {
        var em = mock(EntityManager.class);
        var tokens = mock(UserAccessTokenRepository.class);
        var now = Instant.parse("2026-11-27T10:00:00Z");
        var service = new AccessTokenService(em,tokens,new AuthProperties(Duration.ofHours(2)),Clock.fixed(now,ZoneOffset.UTC));
        var response = service.issue(42L);
        assertThat(response.expiresAt()).isEqualTo(now.plusSeconds(7200));
        assertThat(TokenUtils.hasValidFormat(response.accessToken())).isTrue();
        verify(em).persist(argThat(value -> value instanceof UserAccessToken token
                && token.getTokenHash().equals(TokenUtils.hash(response.accessToken()))
                && token.getUserId().equals(42L) && token.getExpiresAt().equals(response.expiresAt())));
        service.removeExpiredTokens();
        verify(tokens).deleteExpired(now);
    }
}
