package com.budgetplanner.limit.service;
import com.budgetplanner.limit.repository.MonthlyLimitRepository;
import com.budgetplanner.limit.entity.MonthlyLimit;
import com.budgetplanner.limit.dto.LimitWarningLevel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LimitWarningServiceTest {
    final MonthlyLimitRepository repository = mock(MonthlyLimitRepository.class);
    final LimitWarningService service = new LimitWarningService(repository);
    final LocalDate month = LocalDate.of(2026, 11, 1);

    @ParameterizedTest
    @CsvSource({"799.99,false,NEAR_LIMIT", "800,true,NEAR_LIMIT", "1000,true,NEAR_LIMIT", "1000.01,true,EXCEEDED"})
    void exactThresholdsBeforeRounding(String spent, boolean expected, LimitWarningLevel level) {
        var row = mock(MonthlyLimitRepository.Progress.class);
        when(row.getSpentAmount()).thenReturn(new BigDecimal(spent));
        when(row.getLimitAmount()).thenReturn(new BigDecimal("1000"));
        lenient().when(row.getMonthStart()).thenReturn(month);
        when(repository.findProgress(1L, month, month, null)).thenReturn(List.of(row));
        var warnings = service.forPeriod(1L, month.plusDays(14), month.plusDays(15));
        assertThat(warnings).hasSize(expected ? 1 : 0);
        if (expected) {
            assertThat(warnings.getFirst().level()).isEqualTo(level);
            assertThat(warnings.getFirst().spentAmount()).isEqualByComparingTo(spent);
        }
    }

    @Test void noLimitProducesNoWarning() {
        assertThat(service.afterExpense(1L, 2L, month)).isEmpty();
        verify(repository, never()).findProgress(any(), any(), any(), any());
    }

    @Test void emptyAndInvalidProgressProducesNoWarning() {
        var empty = mock(MonthlyLimitRepository.Progress.class);
        var zero = mock(MonthlyLimitRepository.Progress.class);
        when(zero.getSpentAmount()).thenReturn(BigDecimal.ONE);
        when(zero.getLimitAmount()).thenReturn(BigDecimal.ZERO);
        when(repository.findProgress(1L, month, month, null)).thenReturn(List.of(empty, zero));
        assertThat(service.forPeriod(1L, month, month)).isEmpty();
    }

    @Test void expenseLocksLimitAndUsesItsCalendarMonth() {
        when(repository.findForWarning(1L, 2L, month)).thenReturn(Optional.of(mock(MonthlyLimit.class)));
        when(repository.findProgress(1L, month, month, 2L)).thenReturn(List.of());
        assertThat(service.afterExpense(1L, 2L, month.plusDays(20))).isEmpty();
        var order = inOrder(repository);
        order.verify(repository).findForWarning(1L, 2L, month);
        order.verify(repository).findProgress(1L, month, month, 2L);
    }
}
