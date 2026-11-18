package com.budgetplanner.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DashboardTrendPoint(LocalDate periodStart, BigDecimal income, BigDecimal expenses) {}
