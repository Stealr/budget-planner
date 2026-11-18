package com.budgetplanner.limit.service;

import com.budgetplanner.limit.dto.LimitWarningLevel;
import com.budgetplanner.limit.dto.LimitWarningResponse;
import com.budgetplanner.limit.repository.MonthlyLimitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LimitWarningService {
    private static final BigDecimal NEAR_LIMIT_PERCENT = BigDecimal.valueOf(80);

    private final MonthlyLimitRepository limits;

    @Transactional(readOnly = true)
    public List<LimitWarningResponse> forPeriod(Long ownerId, LocalDate dateFrom, LocalDate dateTo) {
        return limits.findProgress(ownerId, dateFrom.withDayOfMonth(1), dateTo.withDayOfMonth(1), null)
                .stream().map(LimitWarningService::warning).flatMap(Optional::stream).toList();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<LimitWarningResponse> afterExpense(Long ownerId, Long categoryId, LocalDate transactionDate) {
        LocalDate monthStart = transactionDate.withDayOfMonth(1);
        // Serialize warning calculations for concurrent expenses against the same limit.
        if (limits.findForWarning(ownerId, categoryId, monthStart).isEmpty()) {
            return Optional.empty();
        }

        return limits.findProgress(ownerId, monthStart, monthStart, categoryId)
                .stream().findFirst().flatMap(LimitWarningService::warning);
    }

    private static Optional<LimitWarningResponse> warning(MonthlyLimitRepository.Progress progress) {
        BigDecimal spent = progress.getSpentAmount();
        BigDecimal limit = progress.getLimitAmount();
        if (spent == null || limit.signum() <= 0) {
            return Optional.empty();
        }

        BigDecimal scaledSpent = spent.movePointRight(2);
        if (scaledSpent.compareTo(limit.multiply(NEAR_LIMIT_PERCENT)) < 0) {
            return Optional.empty();
        }

        LimitWarningLevel level = spent.compareTo(limit) > 0
                ? LimitWarningLevel.EXCEEDED
                : LimitWarningLevel.NEAR_LIMIT;
        return Optional.of(new LimitWarningResponse(progress.getCategoryId(), progress.getCategoryName(),
                YearMonth.from(progress.getMonthStart()), limit, spent,
                scaledSpent.divide(limit, 2, RoundingMode.HALF_UP), level));
    }
}
