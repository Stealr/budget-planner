package com.budgetplanner.goal.service;
import com.budgetplanner.goal.repository.*;
import com.budgetplanner.goal.entity.*;
import com.budgetplanner.common.exception.BusinessConflictException;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class SavingsGoalServiceTest {
    final SavingsGoalRepository goals = mock(SavingsGoalRepository.class);
    final GoalContributionRepository contributions = mock(GoalContributionRepository.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-11-27T12:00:00Z"),ZoneOffset.UTC);
    final SavingsGoalService service = new SavingsGoalService(goals,contributions,clock);

    @Test void overfundingCompletesGoalAndPreservesExactPercentage() {
        var row = mock(SavingsGoalRepository.Progress.class);
        when(row.getSavedAmount()).thenReturn(new BigDecimal("12.34"));
        when(row.getTargetAmount()).thenReturn(new BigDecimal("10"));
        when(goals.findProgress(1L,2L)).thenReturn(List.of(row));
        var result = service.get(1L,2L);
        assertThat(result.completed()).isTrue();
        assertThat(result.progressPercent()).isEqualByComparingTo("123.40");
    }
    @Test void conflictingReplayDoesNotWriteAnything() {
        var goal = new SavingsGoal(1L,"Laptop",BigDecimal.TEN,LocalDate.of(2027,1,1));
        UUID key = UUID.randomUUID();
        when(goals.findByIdAndOwnerId(2L,1L)).thenReturn(Optional.of(goal));
        when(contributions.findByGoalIdAndRequestId(2L,key)).thenReturn(Optional.of(
                new GoalContribution(goal,key,BigDecimal.ONE,LocalDate.now(clock))));
        assertThatThrownBy(() -> service.contribute(1L,2L,key,BigDecimal.TEN)).isInstanceOf(BusinessConflictException.class);
        verify(contributions,never()).save(any());
    }
}
