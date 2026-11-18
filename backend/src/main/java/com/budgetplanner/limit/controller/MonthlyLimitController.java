package com.budgetplanner.limit.controller;

import com.budgetplanner.auth.security.CurrentUserId;
import com.budgetplanner.limit.dto.MonthlyLimitRequest;
import com.budgetplanner.limit.dto.MonthlyLimitResponse;
import com.budgetplanner.limit.service.MonthlyLimitService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@Tag(name = "Monthly limits", description = "Expense category limits and monthly spending")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/limits")
public class MonthlyLimitController {
    private final MonthlyLimitService limits;

    @GetMapping
    public List<MonthlyLimitResponse> list(@CurrentUserId Long ownerId,
                                           @RequestParam @DateTimeFormat(pattern = "uuuu-MM") YearMonth month) {
        return limits.list(ownerId, month);
    }

    @GetMapping("/{categoryId}")
    public MonthlyLimitResponse get(@CurrentUserId Long ownerId, @PathVariable Long categoryId,
                                    @RequestParam @DateTimeFormat(pattern = "uuuu-MM") YearMonth month) {
        return limits.get(ownerId, categoryId, month);
    }

    @PutMapping("/{categoryId}")
    public MonthlyLimitResponse set(@CurrentUserId Long ownerId, @PathVariable Long categoryId,
                                    @RequestParam @DateTimeFormat(pattern = "uuuu-MM") YearMonth month,
                                    @Valid @RequestBody MonthlyLimitRequest request) {
        return limits.set(ownerId, categoryId, month, request.amount());
    }

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentUserId Long ownerId, @PathVariable Long categoryId,
                       @RequestParam @DateTimeFormat(pattern = "uuuu-MM") YearMonth month) {
        limits.delete(ownerId, categoryId, month);
    }
}
