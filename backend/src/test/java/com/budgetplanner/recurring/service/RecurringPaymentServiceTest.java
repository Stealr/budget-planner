package com.budgetplanner.recurring.service;
import com.budgetplanner.category.entity.*;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.recurring.dto.RecurringPaymentRequest;
import com.budgetplanner.recurring.entity.*;
import com.budgetplanner.recurring.repository.*;
import com.budgetplanner.transaction.service.TransactionService;
import com.budgetplanner.common.exception.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class RecurringPaymentServiceTest {
    final RecurringPaymentRepository payments = mock(RecurringPaymentRepository.class);
    final PaymentConfirmationRepository confirmations = mock(PaymentConfirmationRepository.class);
    final CategoryRepository categories = mock(CategoryRepository.class);
    final TransactionService transactions = mock(TransactionService.class);
    final LocalDate today = LocalDate.of(2026,11,27);
    final RecurringPaymentService service = new RecurringPaymentService(payments,confirmations,categories,transactions,
            Clock.fixed(today.atTime(12,0).toInstant(ZoneOffset.UTC),ZoneOffset.UTC));

    @Test void wrongOrUnavailableCategoryCannotBeScheduled() {
        var request = new RecurringPaymentRequest("Rent",BigDecimal.TEN,2L,30,true);
        assertThatThrownBy(() -> service.create(1L,request)).isInstanceOf(ResourceNotFoundException.class);
        var cat = new Category();
        cat.setType(CategoryType.INCOME);
        when(categories.findVisibleForAssignment(1L,2L)).thenReturn(Optional.of(cat));
        assertThatThrownBy(() -> service.create(1L,request)).isInstanceOf(BusinessConflictException.class);
        cat.setType(CategoryType.EXPENSE);
        cat.archive(Instant.EPOCH);
        assertThatThrownBy(() -> service.create(1L,request)).isInstanceOf(BusinessConflictException.class);
        verifyNoInteractions(payments,transactions);
    }
    @Test void reschedulingConfirmedMonthDoesNotCreateAnotherExpense() {
        var payment = new RecurringPayment(1L);
        payment.update("Rent",BigDecimal.TEN,new Category(),28,true);
        when(payments.findByIdAndOwnerId(2L,1L)).thenReturn(Optional.of(payment));
        when(confirmations.findByPaymentIdAndMonthStart(2L,today.withDayOfMonth(1))).thenReturn(Optional.of(
                new PaymentConfirmation(payment,today,42L)));
        assertThatThrownBy(() -> service.confirm(1L,2L,today.plusDays(1))).isInstanceOf(BusinessConflictException.class);
        verifyNoInteractions(transactions);
    }
    @Test void distantOccurrenceCannotCreateExpense() {
        var payment = new RecurringPayment(1L);
        payment.update("Rent",BigDecimal.TEN,new Category(),15,true);
        when(payments.findByIdAndOwnerId(2L,1L)).thenReturn(Optional.of(payment));
        assertThatThrownBy(() -> service.confirm(1L,2L,LocalDate.of(2026,12,15))).isInstanceOf(BusinessConflictException.class);
        verifyNoInteractions(transactions);
    }
}
