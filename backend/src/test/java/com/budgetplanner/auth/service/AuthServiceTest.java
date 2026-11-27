package com.budgetplanner.auth.service;
import com.budgetplanner.auth.dto.*;
import com.budgetplanner.auth.entity.UserAccount;
import com.budgetplanner.auth.repository.UserAccountRepository;
import com.budgetplanner.auth.security.AccountPrincipal;
import com.budgetplanner.common.exception.BusinessConflictException;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import java.sql.SQLException;
import java.time.Instant;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class AuthServiceTest {
    final UserAccountRepository accounts = mock(UserAccountRepository.class);
    final PasswordEncoder encoder = mock(PasswordEncoder.class);
    final AuthenticationManager manager = mock(AuthenticationManager.class);
    final AccessTokenService tokens = mock(AccessTokenService.class);
    final AuthService service = new AuthService(accounts, encoder, manager, tokens);

    @Test void registrationNormalizesEmailAndHashesPassword() {
        when(encoder.encode("password123")).thenReturn("hash");
        when(accounts.saveAndFlush(any())).thenAnswer(call -> {
            UserAccount account = call.getArgument(0);
            assertThat(account.getEmail()).isEqualTo("user@example.com");
            assertThat(account.getPasswordHash()).isEqualTo("hash");
            ReflectionTestUtils.setField(account, "id", 42L);
            return account;
        });
        assertThat(service.register(new RegisterRequest(" User@Example.com ", "password123")).id()).isEqualTo(42);
    }
    @Test void duplicateEmailIsConflictButOtherDatabaseErrorsPropagate() {
        var duplicate = new DataIntegrityViolationException("duplicate",
                new ConstraintViolationException("duplicate", new SQLException(), "user_accounts_email_key"));
        when(accounts.saveAndFlush(any())).thenThrow(duplicate);
        assertThatThrownBy(() -> service.register(new RegisterRequest("a@b.com","password123"))).isInstanceOf(BusinessConflictException.class);
        var other = new DataIntegrityViolationException("database");
        doThrow(other).when(accounts).saveAndFlush(any());
        assertThatThrownBy(() -> service.register(new RegisterRequest("a@b.com","password123"))).isSameAs(other);
    }
    @Test void rejectsUnsupportedCredentialsWithoutRepositoryAccess() {
        assertThatThrownBy(() -> service.register(new RegisterRequest("a@b.com","я".repeat(37)))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.register(new RegisterRequest("x".repeat(255),"password123"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.register(new RegisterRequest("a\0b","password123"))).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(accounts);
    }
    @ParameterizedTest @NullAndEmptySource
    void invalidPasswordCannotLogin(String password) {
        assertThatThrownBy(() -> service.login(new LoginRequest("a@b.com",password))).isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(manager);
    }
    @Test void loginIssuesTokenForAuthenticatedAccount() {
        var account = new UserAccount("a@b.com","hash");
        ReflectionTestUtils.setField(account,"id",42L);
        when(manager.authenticate(any())).thenReturn(UsernamePasswordAuthenticationToken.authenticated(new AccountPrincipal(account),null,java.util.List.of()));
        var expected = new AccessTokenResponse("token","Bearer",Instant.EPOCH);
        when(tokens.issue(42L)).thenReturn(expected);
        assertThat(service.login(new LoginRequest(" A@B.COM ","password123"))).isSameAs(expected);
        verify(manager).authenticate(argThat(auth -> auth.getName().equals("a@b.com")));
    }
    @Test void authenticationFailuresUseSamePublicMessage() {
        when(manager.authenticate(any())).thenThrow(new BadCredentialsException("internal"));
        assertThatThrownBy(() -> service.login(new LoginRequest("a@b.com","password123")))
                .isInstanceOf(BadCredentialsException.class).hasMessage("Неверный email или пароль");
        assertThatThrownBy(() -> service.login(new LoginRequest(null,"password123"))).hasMessage("Неверный email или пароль");
        verifyNoInteractions(tokens);
    }
}
