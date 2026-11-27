package com.budgetplanner.recurring.service;

import java.time.LocalDate;
import java.time.YearMonth;

final class MonthlyPaymentSchedule {
    private static final int REMINDER_DAYS = 3;

    private MonthlyPaymentSchedule() {}

    static LocalDate nextDueDate(int dayOfMonth, LocalDate today) {
        YearMonth month = YearMonth.from(today);
        LocalDate date = dueDate(month, dayOfMonth);
        return date.isBefore(today) ? dueDate(month.plusMonths(1), dayOfMonth) : date;
    }

    static LocalDate reminderWindowEnd(LocalDate today) {
        return today.plusDays(REMINDER_DAYS);
    }

    private static LocalDate dueDate(YearMonth month, int dayOfMonth) {
        return month.atDay(Math.min(dayOfMonth, month.lengthOfMonth()));
    }
}
