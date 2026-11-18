package com.budgetplanner.auth.security;

import com.budgetplanner.auth.repository.UserAccountRepository;
import com.budgetplanner.common.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.DispatcherType;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.introspection.OpaqueTokenIntrospector;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.AuthenticationEntryPoint;

import java.time.Clock;

@Configuration
@EnableScheduling
@EnableConfigurationProperties(AuthProperties.class)
class SecurityConfig {
    @Bean
    Clock authClock() {
        return Clock.systemUTC();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(UserAccountRepository accounts, PasswordEncoder encoder) {
        var provider = new DaoAuthenticationProvider(email -> accounts.findByEmail(email)
                .map(AccountPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("Account not found")));
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, OpaqueTokenIntrospector introspector,
                                           ObjectMapper mapper, Clock clock) throws Exception {
        var bearerEntryPoint = new BearerTokenAuthenticationEntryPoint();
        AuthenticationEntryPoint jsonEntryPoint = (request, response, exception) -> {
            bearerEntryPoint.commence(request, response, exception);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            mapper.writeValue(response.getOutputStream(), new ErrorResponse(
                    clock.instant(), response.getStatus(), "Authentication required", request.getRequestURI()));
        };
        var resolver = new DefaultBearerTokenResolver();
        var publicAuth = PathPatternRequestMatcher.withDefaults();
        var login = publicAuth.matcher(HttpMethod.POST, "/api/v1/auth/login");
        var register = publicAuth.matcher(HttpMethod.POST, "/api/v1/auth/register");

        return http
                .csrf(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(rules -> rules
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(login, register).permitAll()
                        .requestMatchers("/actuator/health", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(errors -> errors.authenticationEntryPoint(jsonEntryPoint))
                .oauth2ResourceServer(resource -> resource
                        .authenticationEntryPoint(jsonEntryPoint)
                        .bearerTokenResolver(request -> login.matches(request) || register.matches(request)
                                ? null : resolver.resolve(request))
                        .opaqueToken(opaque -> opaque.introspector(introspector)))
                .build();
    }
}
