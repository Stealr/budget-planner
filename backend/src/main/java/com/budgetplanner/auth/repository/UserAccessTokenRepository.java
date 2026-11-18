package com.budgetplanner.auth.repository;

import com.budgetplanner.auth.entity.UserAccessToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

public interface UserAccessTokenRepository extends JpaRepository<UserAccessToken, String> {
    Optional<UserAccessToken> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);

    @Modifying
    @Query("delete from UserAccessToken token where token.expiresAt <= :now")
    void deleteExpired(Instant now);
}
