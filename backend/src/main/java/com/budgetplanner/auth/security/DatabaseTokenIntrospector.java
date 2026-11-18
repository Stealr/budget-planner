package com.budgetplanner.auth.security;

import com.budgetplanner.auth.repository.UserAccessTokenRepository;
import com.budgetplanner.auth.util.TokenUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.DefaultOAuth2AuthenticatedPrincipal;
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal;
import org.springframework.security.oauth2.server.resource.introspection.BadOpaqueTokenException;
import org.springframework.security.oauth2.server.resource.introspection.OpaqueTokenIntrospector;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
class DatabaseTokenIntrospector implements OpaqueTokenIntrospector {
    private final UserAccessTokenRepository tokens;
    private final Clock clock;

    @Override
    public OAuth2AuthenticatedPrincipal introspect(String token) {
        if (!TokenUtils.hasValidFormat(token)) {
            throw new BadOpaqueTokenException("Invalid access token");
        }
        var session = tokens.findByTokenHashAndExpiresAtAfter(TokenUtils.hash(token), clock.instant())
                .orElseThrow(() -> new BadOpaqueTokenException("Invalid access token"));
        return new DefaultOAuth2AuthenticatedPrincipal(session.getUserId().toString(),
                Map.of("userId", session.getUserId()), List.of());
    }
}
