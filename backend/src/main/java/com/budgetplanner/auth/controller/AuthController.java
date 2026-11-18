package com.budgetplanner.auth.controller;

import com.budgetplanner.auth.dto.AccessTokenResponse;
import com.budgetplanner.auth.dto.LoginRequest;
import com.budgetplanner.auth.dto.RegisterRequest;
import com.budgetplanner.auth.dto.RegisteredAccountResponse;
import com.budgetplanner.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    RegisteredAccountResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    AccessTokenResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }
}
