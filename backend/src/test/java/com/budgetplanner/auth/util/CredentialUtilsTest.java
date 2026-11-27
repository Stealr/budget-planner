package com.budgetplanner.auth.util;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class CredentialUtilsTest {
    @Test void bcryptChecksUtf8BytesAndNullCharacters() {
        assertThat(CredentialUtils.supportsBcrypt("я".repeat(36))).isTrue();
        assertThat(CredentialUtils.supportsBcrypt("я".repeat(37))).isFalse();
        assertThat(CredentialUtils.supportsBcrypt("x".repeat(73))).isFalse();
        assertThat(CredentialUtils.supportsBcrypt(null)).isFalse();
        assertThat(CredentialUtils.supportsBcrypt("")).isFalse();
        assertThat(CredentialUtils.supportsBcrypt("a\0b")).isFalse();
        assertThat(CredentialUtils.normalizeEmail(" User@Example.COM ")).isEqualTo("user@example.com");
    }
    @Test void tokensAreUniqueAndHashesDeterministic() {
        var first = TokenUtils.generate();
        assertThat(first).isNotEqualTo(TokenUtils.generate());
        assertThat(TokenUtils.hash(first)).hasSize(64).isEqualTo(TokenUtils.hash(first));
        assertThat(TokenUtils.hasValidFormat("invalid")).isFalse();
    }
}
