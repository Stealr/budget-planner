package com.budgetplanner.recurring.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@Entity
@Table(name = "recurring_payment_confirmations")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentConfirmation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false, updatable = false)
    private RecurringPayment payment;

    @Column(name = "month_start", nullable = false, updatable = false)
    private LocalDate monthStart;

    @Column(name = "due_date", nullable = false, updatable = false)
    private LocalDate dueDate;

    @Column(name = "transaction_id", updatable = false)
    private Long transactionId;

    public PaymentConfirmation(RecurringPayment payment, LocalDate dueDate, Long transactionId) {
        this.payment = payment;
        this.monthStart = dueDate.withDayOfMonth(1);
        this.dueDate = dueDate;
        this.transactionId = transactionId;
    }
}
