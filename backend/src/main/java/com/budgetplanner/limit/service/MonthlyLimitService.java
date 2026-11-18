package com.budgetplanner.limit.service;

import com.budgetplanner.category.entity.Category;
import com.budgetplanner.category.entity.CategoryType;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.common.exception.BusinessConflictException;
import com.budgetplanner.common.exception.ResourceNotFoundException;
import com.budgetplanner.limit.dto.MonthlyLimitResponse;
import com.budgetplanner.limit.entity.MonthlyLimit;
import com.budgetplanner.limit.repository.MonthlyLimitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MonthlyLimitService {
    private static final BigDecimal ZERO_AMOUNT = BigDecimal.ZERO.setScale(2);

    private final MonthlyLimitRepository limits;
    private final CategoryRepository categories;

    @Transactional(readOnly = true)
    public List<MonthlyLimitResponse> list(Long ownerId, YearMonth month) {
        return progress(ownerId, month, null);
    }

    @Transactional(readOnly = true)
    public MonthlyLimitResponse get(Long ownerId, Long categoryId, YearMonth month) {
        return progress(ownerId, month, categoryId).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Monthly limit not found for category " + categoryId + " in " + month));
    }

    @Transactional
    public MonthlyLimitResponse set(Long ownerId, Long categoryId, YearMonth month, BigDecimal amount) {
        LocalDate monthStart = startOf(month);
        Category category = lockCategory(ownerId, categoryId);
        if (category.getType() != CategoryType.EXPENSE || category.getArchivedAt() != null) {
            throw new BusinessConflictException("Limits require an active expense category");
        }

        limits.findByOwnerIdAndCategoryIdAndMonthStart(ownerId, categoryId, monthStart).ifPresentOrElse(
                limit -> limit.changeAmount(amount),
                () -> limits.save(new MonthlyLimit(ownerId, category, monthStart, amount)));
        return get(ownerId, categoryId, month);
    }

    @Transactional
    public void delete(Long ownerId, Long categoryId, YearMonth month) {
        LocalDate monthStart = startOf(month);
        lockCategory(ownerId, categoryId);
        limits.findByOwnerIdAndCategoryIdAndMonthStart(ownerId, categoryId, monthStart).ifPresent(limits::delete);
    }

    private Category lockCategory(Long ownerId, Long categoryId) {
        return categories.findVisibleForUpdate(ownerId, categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
    }

    private List<MonthlyLimitResponse> progress(Long ownerId, YearMonth month, Long categoryId) {
        LocalDate monthStart = startOf(month);
        return limits.findProgress(ownerId, monthStart, monthStart, categoryId).stream()
                .map(row -> new MonthlyLimitResponse(row.getCategoryId(), row.getCategoryName(), month,
                        row.getLimitAmount(), row.getSpentAmount() == null ? ZERO_AMOUNT : row.getSpentAmount()))
                .toList();
    }

    private static LocalDate startOf(YearMonth month) {
        if (month.getYear() < 1 || month.getYear() > 9999) {
            throw new IllegalArgumentException("Month must use YYYY-MM with a year from 0001 to 9999");
        }
        return month.atDay(1);
    }
}
