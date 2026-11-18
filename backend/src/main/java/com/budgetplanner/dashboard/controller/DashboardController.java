package com.budgetplanner.dashboard.controller;

import com.budgetplanner.auth.security.CurrentUserId;
import com.budgetplanner.dashboard.dto.DashboardGroupBy;
import com.budgetplanner.dashboard.dto.DashboardResponse;
import com.budgetplanner.dashboard.service.DashboardService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@Tag(name = "Dashboard", description = "Balance, category expenses and spending trend")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final DashboardService dashboard;

    @GetMapping
    public DashboardResponse get(
            @Parameter(hidden = true) @CurrentUserId Long ownerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "DAY") DashboardGroupBy groupBy
    ) {
        return dashboard.get(ownerId, dateFrom, dateTo, groupBy);
    }
}
