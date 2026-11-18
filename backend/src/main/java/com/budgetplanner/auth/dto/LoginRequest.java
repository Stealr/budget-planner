package com.budgetplanner.auth.dto;

public record LoginRequest(String email, String password) {
    @Override
    public String toString() {
        return "LoginRequest[redacted]";
    }
}
