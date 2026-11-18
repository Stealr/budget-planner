package com.budgetplanner.dashboard.service;

import com.budgetplanner.dashboard.dto.DashboardGroupBy;
import com.budgetplanner.dashboard.dto.DashboardResponse;
import com.budgetplanner.dashboard.dto.DashboardTrendPoint;
import com.budgetplanner.dashboard.repository.DashboardRepository;
import com.budgetplanner.limit.service.LimitWarningService;
import com.budgetplanner.goal.service.SavingsGoalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private static final BigDecimal ZERO_AMOUNT = BigDecimal.ZERO.setScale(2);

    private final DashboardRepository repository;
    private final LimitWarningService limitWarnings;
    private final SavingsGoalService savingsGoals;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public DashboardResponse get(Long ownerId, LocalDate dateFrom, LocalDate dateTo, DashboardGroupBy groupBy) {
        if (dateFrom.isAfter(dateTo)) {
            throw new IllegalArgumentException("dateFrom must not be after dateTo");
        }

        BigDecimal openingBalance = repository.openingBalance(ownerId, dateFrom).setScale(2);
        BigDecimal income = ZERO_AMOUNT;
        BigDecimal expenses = ZERO_AMOUNT;
        Map<LocalDate, DashboardTrendPoint> trend = new LinkedHashMap<>();

        for (DashboardRepository.DailyTotals day : repository.dailyTotals(ownerId, dateFrom, dateTo)) {
            income = income.add(day.getIncome());
            expenses = expenses.add(day.getExpenses());
            LocalDate start = groupBy == DashboardGroupBy.WEEK
                    ? day.getDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    : day.getDate();

            var point = new DashboardTrendPoint(start, day.getIncome().setScale(2), day.getExpenses().setScale(2));
            trend.merge(start, point, (previous, next) -> new DashboardTrendPoint(start,
                    previous.income().add(next.income()), previous.expenses().add(next.expenses())));
        }

        BigDecimal balance = openingBalance.add(income).subtract(expenses);
        BigDecimal reservedForGoals = savingsGoals.reservedThrough(ownerId, dateTo);
        return new DashboardResponse(dateFrom, dateTo, groupBy, openingBalance,
                balance, reservedForGoals, balance.subtract(reservedForGoals), income, expenses,
                repository.expensesByCategory(ownerId, dateFrom, dateTo), List.copyOf(trend.values()),
                limitWarnings.forPeriod(ownerId, dateFrom, dateTo));
    }
}
