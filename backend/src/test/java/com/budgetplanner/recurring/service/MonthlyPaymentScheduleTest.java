package com.budgetplanner.recurring.service;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*;
class MonthlyPaymentScheduleTest {
    @ParameterizedTest
    @CsvSource({"31,2024-02-26,2024-02-29","31,2025-02-25,2025-02-28","31,2026-04-30,2026-04-30","1,2026-12-30,2027-01-01","10,2026-11-11,2026-12-10"})
    void clampsDayAndAdvancesToNextOccurrence(int day, String today, String expected) {
        assertThat(MonthlyPaymentSchedule.nextDueDate(day, LocalDate.parse(today))).isEqualTo(LocalDate.parse(expected));
    }
    @ParameterizedTest
    @CsvSource({"2026-12-30,2027-01-02","2024-02-27,2024-03-01"})
    void reminderIncludesThreeCalendarDays(String today, String end) {
        assertThat(MonthlyPaymentSchedule.reminderWindowEnd(LocalDate.parse(today))).isEqualTo(LocalDate.parse(end));
    }
}
