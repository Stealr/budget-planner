package com.budgetplanner.limit.service;
import com.budgetplanner.category.entity.*;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.limit.repository.MonthlyLimitRepository;
import com.budgetplanner.common.exception.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class MonthlyLimitServiceTest {
    final MonthlyLimitRepository limits = mock(MonthlyLimitRepository.class);
    final CategoryRepository categories = mock(CategoryRepository.class);
    final MonthlyLimitService service = new MonthlyLimitService(limits,categories);
    final YearMonth month = YearMonth.of(2026,11);
    @Test void rejectsUnsupportedYearsAndForeignCategories() {
        assertThatThrownBy(() -> service.list(1L,YearMonth.of(0,1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.list(1L,YearMonth.of(10000,1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.delete(1L,2L,month)).isInstanceOf(ResourceNotFoundException.class);
    }
    @Test void onlyActiveExpenseCategoriesAcceptLimits() {
        var category = new Category();
        category.setType(CategoryType.INCOME);
        when(categories.findVisibleForUpdate(1L,2L)).thenReturn(Optional.of(category));
        assertThatThrownBy(() -> service.set(1L,2L,month,BigDecimal.TEN)).isInstanceOf(BusinessConflictException.class);
        category.setType(CategoryType.EXPENSE);
        category.archive(Instant.EPOCH);
        assertThatThrownBy(() -> service.set(1L,2L,month,BigDecimal.TEN)).isInstanceOf(BusinessConflictException.class);
        verifyNoInteractions(limits);
    }
}
