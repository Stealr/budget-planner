package com.budgetplanner.auth.security;

import com.budgetplanner.auth.entity.UserAccount;
import org.springframework.security.core.userdetails.User;

public final class AccountPrincipal extends User {
    private final Long userId;

    public AccountPrincipal(UserAccount account) {
        super(account.getEmail(), account.getPasswordHash(), java.util.List.of());
        this.userId = account.getId();
    }

    public Long userId() {
        return userId;
    }
}
