package com.budgetplanner.auth.util;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

public final class CredentialUtils {
    private CredentialUtils() {}

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean supportsBcrypt(String password) {
        return password != null && !password.isEmpty() && password.length() <= 72
                && password.indexOf(0) < 0 && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
