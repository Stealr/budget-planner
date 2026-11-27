package com.budgetplanner.category.service;
import com.budgetplanner.category.dto.CategoryRequest;
import com.budgetplanner.category.entity.*;
import com.budgetplanner.category.mapper.CategoryMapper;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.transaction.repository.TransactionRepository;
import com.budgetplanner.limit.repository.MonthlyLimitRepository;
import com.budgetplanner.recurring.repository.RecurringPaymentRepository;
import com.budgetplanner.common.exception.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CategoryServiceTest {
    final CategoryRepository categories = mock(CategoryRepository.class);
    final TransactionRepository transactions = mock(TransactionRepository.class);
    final MonthlyLimitRepository limits = mock(MonthlyLimitRepository.class);
    final RecurringPaymentRepository recurring = mock(RecurringPaymentRepository.class);
    final CategoryService service = new CategoryService(new CategoryMapper(),categories,transactions,limits,recurring);

    Category category() {
        var category = new Category();
        category.setId(2L);
        category.setName("Food");
        category.setType(CategoryType.EXPENSE);
        when(categories.findVisibleForUpdate(1L,2L)).thenReturn(Optional.of(category));
        return category;
    }

    @Test void standardCatalogCannotBeChanged() {
        var category = category();
        ReflectionTestUtils.setField(category,"standardCode","FOOD");
        assertThatThrownBy(() -> service.update(1L,2L,new CategoryRequest("Other",CategoryType.EXPENSE))).isInstanceOf(BusinessConflictException.class);
        assertThatThrownBy(() -> service.archive(1L,2L)).isInstanceOf(BusinessConflictException.class);
        assertThatThrownBy(() -> service.delete(1L,2L)).isInstanceOf(BusinessConflictException.class);
    }
    @Test void missingOrForeignCategoryIsNotFound() {
        assertThatThrownBy(() -> service.archive(1L,2L)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(transactions,limits,recurring);
    }
    @Test void limitsPreventTypeChangeAndDeletionButAllowRenaming() {
        category();
        when(limits.existsByCategoryId(2L)).thenReturn(true);
        assertThatThrownBy(() -> service.update(1L,2L,new CategoryRequest("Other",CategoryType.INCOME))).isInstanceOf(BusinessConflictException.class);
        assertThat(service.update(1L,2L,new CategoryRequest(" Renamed ",CategoryType.EXPENSE)).name()).isEqualTo("Renamed");
        assertThatThrownBy(() -> service.delete(1L,2L)).isInstanceOf(BusinessConflictException.class);
    }
    @Test void unreferencedCategoryCanChangeType() {
        category();
        assertThat(service.update(1L,2L,new CategoryRequest("Salary",CategoryType.INCOME)).type()).isEqualTo(CategoryType.INCOME);
    }
}
