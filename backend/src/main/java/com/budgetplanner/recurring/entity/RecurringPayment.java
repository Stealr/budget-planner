package com.budgetplanner.recurring.entity;

import com.budgetplanner.category.entity.Category;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Entity
@Table(name = "recurring_payments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecurringPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private Long ownerId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "day_of_month", nullable = false)
    private int dayOfMonth;

    @Column(name = "reminders_enabled", nullable = false)
    private boolean remindersEnabled;

    public RecurringPayment(Long ownerId) {
        this.ownerId = ownerId;
    }

    public void update(String name, BigDecimal amount, Category category, int dayOfMonth, boolean remindersEnabled) {
        this.name = name;
        this.amount = amount;
        this.category = category;
        this.dayOfMonth = dayOfMonth;
        this.remindersEnabled = remindersEnabled;
    }
}
