package com.budgetplanner.recurring.controller;

import com.budgetplanner.auth.security.CurrentUserId;
import com.budgetplanner.recurring.dto.PaymentConfirmationResponse;
import com.budgetplanner.recurring.dto.PaymentReminderResponse;
import com.budgetplanner.recurring.dto.RecurringPaymentRequest;
import com.budgetplanner.recurring.dto.RecurringPaymentResponse;
import com.budgetplanner.recurring.service.RecurringPaymentService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Recurring payments", description = "Monthly payment settings, reminders and confirmations")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/recurring-payments")
public class RecurringPaymentController {
    private final RecurringPaymentService payments;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecurringPaymentResponse create(@Parameter(hidden = true) @CurrentUserId Long ownerId,
                                           @Valid @RequestBody RecurringPaymentRequest request) {
        return payments.create(ownerId, request);
    }

    @GetMapping
    public List<RecurringPaymentResponse> list(@Parameter(hidden = true) @CurrentUserId Long ownerId) {
        return payments.list(ownerId);
    }

    @PutMapping("/{paymentId}")
    public RecurringPaymentResponse update(@Parameter(hidden = true) @CurrentUserId Long ownerId,
                                          @PathVariable Long paymentId,
                                          @Valid @RequestBody RecurringPaymentRequest request) {
        return payments.update(ownerId, paymentId, request);
    }

    @DeleteMapping("/{paymentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@Parameter(hidden = true) @CurrentUserId Long ownerId, @PathVariable Long paymentId) {
        payments.delete(ownerId, paymentId);
    }

    @GetMapping("/reminders")
    public List<PaymentReminderResponse> reminders(@Parameter(hidden = true) @CurrentUserId Long ownerId) {
        return payments.reminders(ownerId);
    }

    @PutMapping("/{paymentId}/occurrences/{dueDate}/confirm")
    public PaymentConfirmationResponse confirm(@Parameter(hidden = true) @CurrentUserId Long ownerId,
                                               @PathVariable Long paymentId,
                                               @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                               LocalDate dueDate) {
        return payments.confirm(ownerId, paymentId, dueDate);
    }
}
