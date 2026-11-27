package com.budgetplanner.dashboard.service;
import com.budgetplanner.dashboard.repository.DashboardRepository;
import com.budgetplanner.dashboard.dto.DashboardGroupBy;
import com.budgetplanner.limit.service.LimitWarningService;
import com.budgetplanner.goal.service.SavingsGoalService;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class DashboardServiceTest {
    final DashboardRepository repository = mock(DashboardRepository.class);
    final LimitWarningService warnings = mock(LimitWarningService.class);
    final SavingsGoalService goals = mock(SavingsGoalService.class);
    final DashboardService service = new DashboardService(repository,warnings,goals);
    @Test void invalidDatesDoNotReadFinancialData() {
        var date = LocalDate.of(2026,11,27);
        assertThatThrownBy(() -> service.get(1L,date,date.minusDays(1),DashboardGroupBy.DAY)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository,warnings,goals);
    }
    @Test void weeklyGroupingMergesDaysAndPreservesNegativeAvailableBalance() {
        var monday = LocalDate.of(2026,11,23);
        var first = mock(DashboardRepository.DailyTotals.class);
        var second = mock(DashboardRepository.DailyTotals.class);
        when(first.getDate()).thenReturn(monday);
        when(second.getDate()).thenReturn(monday.plusDays(2));
        when(first.getIncome()).thenReturn(new BigDecimal("20.10"));
        when(second.getIncome()).thenReturn(BigDecimal.ZERO);
        when(first.getExpenses()).thenReturn(new BigDecimal("2.05"));
        when(second.getExpenses()).thenReturn(new BigDecimal("3.01"));
        when(repository.openingBalance(1L,monday)).thenReturn(BigDecimal.TEN);
        when(repository.dailyTotals(1L,monday,monday.plusDays(6))).thenReturn(List.of(first,second));
        when(goals.reservedThrough(1L,monday.plusDays(6))).thenReturn(new BigDecimal("40"));
        var result = service.get(1L,monday,monday.plusDays(6),DashboardGroupBy.WEEK);
        assertThat(result.balance()).isEqualByComparingTo("25.04");
        assertThat(result.availableBalance()).isEqualByComparingTo("-14.96");
        assertThat(result.trend()).hasSize(1);
        assertThat(result.trend().getFirst().expenses()).isEqualByComparingTo("5.06");
    }
}
