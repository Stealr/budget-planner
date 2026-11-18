package com.budgetplanner.auth.service;

import com.budgetplanner.auth.dto.AccessTokenResponse;
import com.budgetplanner.auth.dto.LoginRequest;
import com.budgetplanner.auth.dto.RegisterRequest;
import com.budgetplanner.auth.dto.RegisteredAccountResponse;
import com.budgetplanner.auth.entity.UserAccount;
import com.budgetplanner.auth.repository.UserAccountRepository;
import com.budgetplanner.auth.security.AccountPrincipal;
import com.budgetplanner.auth.util.CredentialUtils;
import com.budgetplanner.common.exception.BusinessConflictException;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final String EMAIL_CONSTRAINT = "user_accounts_email_key";
    private final UserAccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final AccessTokenService tokens;

    public RegisteredAccountResponse register(RegisterRequest request) {
        if (!CredentialUtils.supportsBcrypt(request.password())) {
            throw new IllegalArgumentException("Пароль должен занимать не более 72 байт UTF-8 и не содержать нулевой символ");
        }

        String email = CredentialUtils.normalizeEmail(request.email());
        if (email.length() > 254 || email.indexOf(0) >= 0) {
            throw new IllegalArgumentException("Некорректный email");
        }
        try {
            UserAccount account = accounts.saveAndFlush(new UserAccount(email, passwordEncoder.encode(request.password())));
            return new RegisteredAccountResponse(account.getId(), account.getEmail());
        } catch (DataIntegrityViolationException exception) {
            if (exception.getCause() instanceof ConstraintViolationException violation
                    && EMAIL_CONSTRAINT.equals(violation.getConstraintName())) {
                throw new BusinessConflictException("Email уже занят");
            }
            throw exception;
        }
    }

    public AccessTokenResponse login(LoginRequest request) {
        if (request.email() == null || request.email().length() > 254 || request.email().indexOf(0) >= 0
                || !CredentialUtils.supportsBcrypt(request.password())) {
            throw invalidCredentials();
        }

        String email = CredentialUtils.normalizeEmail(request.email());
        try {
            var authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
            return tokens.issue(((AccountPrincipal) authentication.getPrincipal()).userId());
        } catch (BadCredentialsException exception) {
            throw invalidCredentials();
        }
    }

    private static BadCredentialsException invalidCredentials() {
        return new BadCredentialsException("Неверный email или пароль");
    }
}
