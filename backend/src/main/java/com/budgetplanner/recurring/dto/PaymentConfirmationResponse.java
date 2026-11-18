package com.budgetplanner.recurring.dto;

import com.budgetplanner.limit.dto.LimitWarningResponse;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;

public record PaymentConfirmationResponse(
        Long paymentId,
        LocalDate dueDate,
        Long transactionId,
        @JsonInclude(JsonInclude.Include.NON_NULL) LimitWarningResponse limitWarning
) {}
