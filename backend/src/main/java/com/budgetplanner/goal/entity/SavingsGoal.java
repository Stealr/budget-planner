package com.budgetplanner.goal.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Entity
@Table(name = "savings_goals")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SavingsGoal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private Long ownerId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "target_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal targetAmount;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    public SavingsGoal(Long ownerId, String name, BigDecimal targetAmount, LocalDate dueDate) {
        this.ownerId = ownerId;
        this.name = name;
        this.targetAmount = targetAmount;
        this.dueDate = dueDate;
    }
}
