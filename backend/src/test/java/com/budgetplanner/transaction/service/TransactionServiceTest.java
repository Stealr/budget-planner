package com.budgetplanner.transaction.service;
import com.budgetplanner.category.entity.*;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.transaction.dto.TransactionRequest;
import com.budgetplanner.transaction.mapper.TransactionMapper;
import com.budgetplanner.transaction.repository.TransactionRepository;
import com.budgetplanner.limit.service.LimitWarningService;
import com.budgetplanner.common.exception.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TransactionServiceTest {
    final TransactionRepository transactions = mock(TransactionRepository.class);
    final CategoryRepository categories = mock(CategoryRepository.class);
    final LimitWarningService warnings = mock(LimitWarningService.class);
    final TransactionService service = new TransactionService(transactions,categories,new TransactionMapper(),warnings);
    final LocalDate date = LocalDate.of(2026,11,27);

    TransactionRequest request(BigDecimal amount) {
        return new TransactionRequest(amount,CategoryType.EXPENSE,2L,null,date);
    }
    @ParameterizedTest @ValueSource(strings={"0","-1","0.001","100000000000000000"})
    void rejectsInvalidMoneyBeforeAccessingCategory(String amount) {
        assertThatThrownBy(() -> service.create(1L,request(new BigDecimal(amount)))).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(categories,transactions,warnings);
    }
    @Test void rejectsMissingAmountAndInvalidPeriod() {
        assertThatThrownBy(() -> service.create(1L,request(null))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.list(1L,null,null,date,date.minusDays(1),null)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void validatesCategoryOwnershipTypeAndArchive() {
        assertThatThrownBy(() -> service.create(1L,request(BigDecimal.ONE))).isInstanceOf(ResourceNotFoundException.class);
        var category = new Category();
        category.setId(2L);
        category.setType(CategoryType.INCOME);
        when(categories.findVisibleForAssignment(1L,2L)).thenReturn(Optional.of(category));
        assertThatThrownBy(() -> service.create(1L,request(BigDecimal.ONE))).isInstanceOf(BusinessConflictException.class);
        category.setType(CategoryType.EXPENSE);
        category.archive(java.time.Instant.EPOCH);
        assertThatThrownBy(() -> service.create(1L,request(BigDecimal.ONE))).isInstanceOf(BusinessConflictException.class);
        verifyNoInteractions(transactions,warnings);
    }
}
