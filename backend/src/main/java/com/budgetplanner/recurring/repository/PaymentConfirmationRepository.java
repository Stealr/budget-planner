package com.budgetplanner.recurring.repository;

import com.budgetplanner.recurring.entity.PaymentConfirmation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PaymentConfirmationRepository extends JpaRepository<PaymentConfirmation, Long> {
    Optional<PaymentConfirmation> findByPaymentIdAndMonthStart(Long paymentId, LocalDate monthStart);

    @Query("""
            select c from PaymentConfirmation c
            where c.payment.ownerId = :ownerId and c.monthStart between :firstMonth and :lastMonth
            """)
    List<PaymentConfirmation> findForOwnerInMonths(@Param("ownerId") Long ownerId,
                                                    @Param("firstMonth") LocalDate firstMonth,
                                                    @Param("lastMonth") LocalDate lastMonth);
}
