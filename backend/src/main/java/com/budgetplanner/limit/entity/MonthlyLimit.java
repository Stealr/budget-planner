package com.budgetplanner.limit.entity;

import com.budgetplanner.category.entity.Category;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Entity
@Table(name = "monthly_limits")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MonthlyLimit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", updatable = false)
    private Long ownerId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false, updatable = false)
    private Category category;

    @Column(name = "month_start", nullable = false, updatable = false)
    private LocalDate monthStart;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    public MonthlyLimit(Long ownerId, Category category, LocalDate monthStart, BigDecimal amount) {
        this.ownerId = ownerId;
        this.category = category;
        this.monthStart = monthStart;
        this.amount = amount;
    }

    public void changeAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
