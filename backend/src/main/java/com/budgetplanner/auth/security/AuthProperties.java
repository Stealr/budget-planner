package com.budgetplanner.auth.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

@ConfigurationProperties("app.auth")
public record AuthProperties(@DefaultValue("24h") Duration accessTokenTtl) {
    public AuthProperties {
        if (accessTokenTtl.isNegative() || accessTokenTtl.isZero()) {
            throw new IllegalArgumentException("app.auth.access-token-ttl must be positive");
        }
    }
}
