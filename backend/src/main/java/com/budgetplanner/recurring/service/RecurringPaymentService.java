package com.budgetplanner.recurring.service;

import com.budgetplanner.category.entity.Category;
import com.budgetplanner.category.entity.CategoryType;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.common.exception.BusinessConflictException;
import com.budgetplanner.common.exception.ResourceNotFoundException;
import com.budgetplanner.recurring.dto.PaymentConfirmationResponse;
import com.budgetplanner.recurring.dto.PaymentReminderResponse;
import com.budgetplanner.recurring.dto.RecurringPaymentRequest;
import com.budgetplanner.recurring.dto.RecurringPaymentResponse;
import com.budgetplanner.recurring.entity.PaymentConfirmation;
import com.budgetplanner.recurring.entity.RecurringPayment;
import com.budgetplanner.recurring.repository.PaymentConfirmationRepository;
import com.budgetplanner.recurring.repository.RecurringPaymentRepository;
import com.budgetplanner.transaction.dto.TransactionRequest;
import com.budgetplanner.transaction.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecurringPaymentService {
    private final RecurringPaymentRepository payments;
    private final PaymentConfirmationRepository confirmations;
    private final CategoryRepository categories;
    private final TransactionService transactions;
    private final Clock clock;

    @Transactional
    public RecurringPaymentResponse create(Long ownerId, RecurringPaymentRequest request) {
        RecurringPayment payment = new RecurringPayment(ownerId);
        applySettings(payment, request);
        return toResponse(payments.save(payment));
    }

    @Transactional(readOnly = true)
    public List<RecurringPaymentResponse> list(Long ownerId) {
        return payments.findAllForOwner(ownerId).stream().map(RecurringPaymentService::toResponse).toList();
    }

    @Transactional
    public RecurringPaymentResponse update(Long ownerId, Long paymentId, RecurringPaymentRequest request) {
        RecurringPayment payment = lockPayment(ownerId, paymentId);
        applySettings(payment, request);
        return toResponse(payment);
    }

    @Transactional
    public void delete(Long ownerId, Long paymentId) {
        payments.delete(lockPayment(ownerId, paymentId));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<PaymentReminderResponse> reminders(Long ownerId) {
        LocalDate today = LocalDate.now(clock);
        LocalDate windowEnd = MonthlyPaymentSchedule.reminderWindowEnd(today);
        var confirmed = confirmations.findForOwnerInMonths(ownerId, today.withDayOfMonth(1), windowEnd.withDayOfMonth(1))
                .stream().map(c -> new Occurrence(c.getPayment().getId(), c.getMonthStart()))
                .collect(Collectors.toSet());

        return payments.findReminderCandidates(ownerId).stream()
                .map(p -> toReminder(p, MonthlyPaymentSchedule.nextDueDate(p.getDayOfMonth(), today)))
                .filter(reminder -> !reminder.dueDate().isAfter(windowEnd))
                .filter(reminder -> !confirmed.contains(
                        new Occurrence(reminder.paymentId(), reminder.dueDate().withDayOfMonth(1))))
                .sorted(Comparator.comparing(PaymentReminderResponse::dueDate)
                        .thenComparing(PaymentReminderResponse::paymentId))
                .toList();
    }

    @Transactional
    public PaymentConfirmationResponse confirm(Long ownerId, Long paymentId, LocalDate dueDate) {
        RecurringPayment payment = lockPayment(ownerId, paymentId);
        var existing = confirmations.findByPaymentIdAndMonthStart(paymentId, dueDate.withDayOfMonth(1));
        if (existing.isPresent()) {
            PaymentConfirmation confirmation = existing.get();
            if (!confirmation.getDueDate().equals(dueDate)) {
                throw new BusinessConflictException("Payment was already confirmed for this month");
            }
            return new PaymentConfirmationResponse(paymentId, dueDate, confirmation.getTransactionId(), null);
        }

        LocalDate today = LocalDate.now(clock);
        LocalDate expected = MonthlyPaymentSchedule.nextDueDate(payment.getDayOfMonth(), today);
        if (!dueDate.equals(expected) || dueDate.isAfter(MonthlyPaymentSchedule.reminderWindowEnd(today))) {
            throw new BusinessConflictException("Payment date is outside the current confirmation window");
        }

        var operation = transactions.create(ownerId, new TransactionRequest(payment.getAmount(), CategoryType.EXPENSE,
                payment.getCategory().getId(), payment.getName(), today));
        confirmations.save(new PaymentConfirmation(payment, dueDate, operation.id()));
        return new PaymentConfirmationResponse(paymentId, dueDate, operation.id(), operation.limitWarning());
    }

    private void applySettings(RecurringPayment payment, RecurringPaymentRequest request) {
        Category category = categories.findVisibleForAssignment(payment.getOwnerId(), request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + request.categoryId()));
        if (category.getType() != CategoryType.EXPENSE || category.getArchivedAt() != null) {
            throw new BusinessConflictException("Recurring payments require an active expense category");
        }

        payment.update(request.name().strip(), request.amount(), category,
                request.dayOfMonth(), request.remindersEnabled());
    }

    private RecurringPayment lockPayment(Long ownerId, Long paymentId) {
        return payments.findByIdAndOwnerId(paymentId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring payment not found: " + paymentId));
    }

    private static RecurringPaymentResponse toResponse(RecurringPayment payment) {
        return new RecurringPaymentResponse(payment.getId(), payment.getName(), payment.getAmount(),
                payment.getCategory().getId(), payment.getCategory().getName(), payment.getDayOfMonth(),
                payment.isRemindersEnabled());
    }

    private static PaymentReminderResponse toReminder(RecurringPayment payment, LocalDate dueDate) {
        return new PaymentReminderResponse(payment.getId(), payment.getName(), payment.getAmount(),
                payment.getCategory().getId(), payment.getCategory().getName(), dueDate);
    }

    private record Occurrence(Long paymentId, LocalDate monthStart) {}
}
