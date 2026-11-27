package com.budgetplanner;

import com.budgetplanner.auth.dto.*;
import com.budgetplanner.auth.service.AuthService;
import com.budgetplanner.category.dto.*;
import com.budgetplanner.category.entity.CategoryType;
import com.budgetplanner.category.service.CategoryService;
import com.budgetplanner.common.exception.*;
import com.budgetplanner.dashboard.dto.DashboardGroupBy;
import com.budgetplanner.dashboard.service.DashboardService;
import com.budgetplanner.goal.dto.*;
import com.budgetplanner.goal.service.SavingsGoalService;
import com.budgetplanner.limit.service.MonthlyLimitService;
import com.budgetplanner.recurring.dto.*;
import com.budgetplanner.recurring.service.RecurringPaymentService;
import com.budgetplanner.transaction.dto.*;
import com.budgetplanner.transaction.service.TransactionService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.data.domain.PageRequest;
import org.springframework.context.annotation.*;
import org.springframework.boot.test.context.TestConfiguration;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;

import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(BusinessIntegrationTest.FixedTime.class)
class BusinessIntegrationTest {
    static final EmbeddedPostgres POSTGRES = startDatabase();
    static final LocalDate TODAY = LocalDate.of(2026,11,27);
    static final YearMonth MONTH = YearMonth.from(TODAY);

    static EmbeddedPostgres startDatabase() {
        try { return EmbeddedPostgres.builder()
                .setErrorRedirector(ProcessBuilder.Redirect.INHERIT)
                .setOutputRedirector(ProcessBuilder.Redirect.INHERIT)
                .start(); }
        catch (java.io.IOException error) { throw new ExceptionInInitializerError(error); }
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres","postgres"));
        properties.add("spring.datasource.username", () -> "postgres");
        properties.add("spring.datasource.password", () -> "postgres");
        properties.add("spring.datasource.hikari.maximum-pool-size", () -> "4");
    }

    @TestConfiguration
    static class FixedTime {
        @Bean @Primary Clock testClock() {
            return Clock.fixed(TODAY.atTime(12,0).toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
        }
    }

    @Autowired AuthService auth;
    @Autowired CategoryService categories;
    @Autowired TransactionService transactions;
    @Autowired MonthlyLimitService limits;
    @Autowired DashboardService dashboard;
    @Autowired SavingsGoalService goals;
    @Autowired RecurringPaymentService recurring;
    @Autowired MockMvc mvc;
    long owner;
    long other;

    @BeforeEach void accounts() {
        owner = register();
        other = register();
    }

    long register() {
        return auth.register(new RegisterRequest(UUID.randomUUID()+"@example.com","password123")).id();
    }

    BigDecimal money(String value) { return new BigDecimal(value); }

    TransactionRequest expense(Long categoryId, String amount, LocalDate date) {
        return new TransactionRequest(money(amount), CategoryType.EXPENSE, categoryId,"test",date);
    }

    @Test void categoriesAndTransactionsPreserveHistoryAndOwnership() {
        assertThat(categories.list(owner,false)).filteredOn(CategoryResponse::standard).hasSize(10);
        var cat = categories.create(owner,new CategoryRequest(" Food ",CategoryType.EXPENSE));
        assertThat(cat.name()).isEqualTo("Food");
        assertThatThrownBy(() -> categories.get(other,cat.id())).isInstanceOf(ResourceNotFoundException.class);
        var tx = transactions.create(owner,expense(cat.id(),"12.34",TODAY));
        assertThat(transactions.get(owner,tx.id()).amount()).isEqualByComparingTo("12.34");
        assertThatThrownBy(() -> transactions.get(other,tx.id())).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> transactions.update(other,tx.id(),expense(cat.id(),"1",TODAY))).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> transactions.delete(other,tx.id())).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> categories.delete(owner,cat.id())).isInstanceOf(BusinessConflictException.class);
        assertThatThrownBy(() -> categories.update(owner,cat.id(),new CategoryRequest("Food",CategoryType.INCOME))).isInstanceOf(BusinessConflictException.class);
        categories.archive(owner,cat.id());
        categories.archive(owner,cat.id());
        assertThat(categories.list(owner,false)).noneMatch(c -> c.id().equals(cat.id()));
        assertThat(categories.list(owner,true)).anyMatch(c -> c.id().equals(cat.id()));
        assertThatThrownBy(() -> transactions.create(owner,expense(cat.id(),"1",TODAY))).isInstanceOf(BusinessConflictException.class);
        transactions.update(owner,tx.id(),expense(cat.id(),"20",TODAY));
        assertThat(transactions.list(owner,null,null,TODAY,TODAY,PageRequest.of(0,20)).getTotalElements()).isEqualTo(1);
        transactions.delete(owner,tx.id());
        categories.delete(owner,cat.id());
        assertThatThrownBy(() -> categories.get(owner,cat.id())).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void limitsWarningsAndDashboardUseExactCalendarTotals() {
        var cat = categories.create(owner,new CategoryRequest("Expenses",CategoryType.EXPENSE));
        var income = categories.list(owner,false).stream().filter(c -> c.type()==CategoryType.INCOME).findFirst().orElseThrow();
        limits.set(owner,cat.id(),MONTH,money("100"));
        assertThat(limits.get(owner,cat.id(),MONTH).spentAmount()).isEqualByComparingTo("0");
        transactions.create(owner,new TransactionRequest(money("200"),CategoryType.INCOME,income.id(),null,TODAY.minusMonths(1)));
        transactions.create(owner,expense(cat.id(),"20",TODAY.withDayOfMonth(1).minusDays(1)));
        assertThat(transactions.create(owner,expense(cat.id(),"79.99",TODAY)).limitWarning()).isNull();
        assertThat(transactions.create(owner,expense(cat.id(),"0.01",TODAY)).limitWarning().level().name()).isEqualTo("NEAR_LIMIT");
        var last = transactions.create(owner,expense(cat.id(),"20.01",TODAY));
        assertThat(last.limitWarning().level().name()).isEqualTo("EXCEEDED");
        var report = dashboard.get(owner,TODAY.withDayOfMonth(1),TODAY,DashboardGroupBy.WEEK);
        assertThat(report.openingBalance()).isEqualByComparingTo("180");
        assertThat(report.balance()).isEqualByComparingTo("79.99");
        assertThat(report.expenses()).isEqualByComparingTo("100.01");
        assertThat(report.expensesByCategory()).hasSize(1);
        assertThat(report.limitWarnings()).hasSize(1);
        assertThat(dashboard.get(other,TODAY,TODAY,DashboardGroupBy.DAY).expenses()).isEqualByComparingTo("0");
        assertThat(limits.list(other,MONTH)).isEmpty();
        assertThatThrownBy(() -> limits.get(other,cat.id(),MONTH)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> limits.set(other,cat.id(),MONTH,money("10"))).isInstanceOf(ResourceNotFoundException.class);
        limits.set(owner,cat.id(),MONTH,money("200"));
        assertThat(limits.list(owner,MONTH)).hasSize(1);
        limits.delete(owner,cat.id(),MONTH);
        limits.delete(owner,cat.id(),MONTH);
        assertThat(limits.list(owner,MONTH)).isEmpty();
    }

    @Test void goalContributionsAreIdempotentAndSeparateFromExpenses() {
        var goal = goals.create(owner,new SavingsGoalRequest(" Laptop ",money("100"),TODAY.plusMonths(2)));
        var key = UUID.randomUUID();
        assertThat(goals.contribute(owner,goal.id(),key,money("60")).completed()).isFalse();
        assertThat(goals.contribute(owner,goal.id(),key,money("60")).savedAmount()).isEqualByComparingTo("60");
        assertThatThrownBy(() -> goals.contribute(owner,goal.id(),key,money("61"))).isInstanceOf(BusinessConflictException.class);
        assertThat(goals.contribute(owner,goal.id(),UUID.randomUUID(),money("40")).completed()).isTrue();
        assertThat(goals.list(owner)).hasSize(1);
        assertThat(goals.list(other)).isEmpty();
        assertThatThrownBy(() -> goals.get(other,goal.id())).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> goals.contribute(other,goal.id(),UUID.randomUUID(),money("1"))).isInstanceOf(ResourceNotFoundException.class);
        var report = dashboard.get(owner,TODAY,TODAY,DashboardGroupBy.DAY);
        assertThat(report.expenses()).isEqualByComparingTo("0");
        assertThat(report.reservedForGoals()).isEqualByComparingTo("100");
        assertThat(report.availableBalance()).isEqualByComparingTo("-100");
        assertThat(goals.reservedThrough(owner,TODAY.minusDays(1))).isEqualByComparingTo("0");
    }

    @Test void recurringPaymentsRequireConfirmationAndNeverDuplicateExpenses() {
        var cat = categories.create(owner,new CategoryRequest("Rent",CategoryType.EXPENSE));
        var request = new RecurringPaymentRequest(" Rent ",money("80"),cat.id(),30,true);
        var payment = recurring.create(owner,request);
        assertThat(recurring.list(owner)).hasSize(1);
        assertThat(recurring.list(other)).isEmpty();
        assertThat(recurring.reminders(owner)).hasSize(1);
        assertThat(recurring.reminders(owner)).hasSize(1);
        assertThatThrownBy(() -> categories.delete(owner,cat.id())).isInstanceOf(BusinessConflictException.class);
        assertThatThrownBy(() -> categories.update(owner,cat.id(),new CategoryRequest("Rent",CategoryType.INCOME))).isInstanceOf(BusinessConflictException.class);
        recurring.update(owner,payment.id(),new RecurringPaymentRequest("Rent",money("80"),cat.id(),30,false));
        assertThat(recurring.reminders(owner)).isEmpty();
        recurring.update(owner,payment.id(),request);
        assertThatThrownBy(() -> recurring.confirm(other,payment.id(),TODAY.withDayOfMonth(30))).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> recurring.confirm(owner,payment.id(),TODAY.plusMonths(1))).isInstanceOf(BusinessConflictException.class);
        var result = recurring.confirm(owner,payment.id(),TODAY.withDayOfMonth(30));
        assertThat(recurring.confirm(owner,payment.id(),TODAY.withDayOfMonth(30)).transactionId()).isEqualTo(result.transactionId());
        assertThat(recurring.reminders(owner)).isEmpty();
        assertThat(transactions.list(owner,null,null,null,null,PageRequest.of(0,20)).getTotalElements()).isEqualTo(1);
        transactions.delete(owner,result.transactionId());
        assertThat(recurring.confirm(owner,payment.id(),TODAY.withDayOfMonth(30)).transactionId()).isNull();
        recurring.delete(owner,payment.id());
        categories.delete(owner,cat.id());
    }


    @Test
    void simultaneousRetriesCreditOneContributionAndCreateOneExpense() throws Exception {
        var goal = goals.create(owner, new SavingsGoalRequest("Laptop", money("100"), TODAY.plusMonths(1)));
        var contributionId = UUID.randomUUID();
        var category = categories.create(owner, new CategoryRequest("Subscription", CategoryType.EXPENSE));
        var payment = recurring.create(owner,
                new RecurringPaymentRequest("Subscription", money("10"), category.id(), TODAY.getDayOfMonth(), true));

        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var ready = new java.util.concurrent.CountDownLatch(2);
            var start = new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.Callable<SavingsGoalResponse> contribute = () -> {
                ready.countDown();
                if (!start.await(10, java.util.concurrent.TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Contribution start barrier timed out");
                }
                return goals.contribute(owner, goal.id(), contributionId, money("30"));
            };
            var first = executor.submit(contribute);
            var second = executor.submit(contribute);
            assertThat(ready.await(10, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(first.get(15, java.util.concurrent.TimeUnit.SECONDS).savedAmount()).isEqualByComparingTo("30");
            assertThat(second.get(15, java.util.concurrent.TimeUnit.SECONDS).savedAmount()).isEqualByComparingTo("30");

            var paymentReady = new java.util.concurrent.CountDownLatch(2);
            var paymentStart = new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.Callable<PaymentConfirmationResponse> confirm = () -> {
                paymentReady.countDown();
                if (!paymentStart.await(10, java.util.concurrent.TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Payment start barrier timed out");
                }
                return recurring.confirm(owner, payment.id(), TODAY);
            };
            var firstPayment = executor.submit(confirm);
            var secondPayment = executor.submit(confirm);
            assertThat(paymentReady.await(10, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            paymentStart.countDown();
            assertThat(firstPayment.get(15, java.util.concurrent.TimeUnit.SECONDS).transactionId())
                    .isEqualTo(secondPayment.get(15, java.util.concurrent.TimeUnit.SECONDS).transactionId());
        }

        assertThat(goals.get(owner, goal.id()).savedAmount()).isEqualByComparingTo("30");
        assertThat(transactions.list(owner, null, null, null, null, PageRequest.of(0, 20)).getTotalElements())
                .isEqualTo(1);
    }
    @Test void httpSecurityValidationAndLoginWorkTogether() throws Exception {
        mvc.perform(get("/api/v1/goals")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content("{\"email\":\"bad\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest());
        String email = UUID.randomUUID()+"@example.com";
        String body = "{\"email\":\""+email+"\",\"password\":\"password123\"}";
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(body)).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(body)).andExpect(status().isConflict());
        var login = auth.login(new LoginRequest(email,"password123"));
        mvc.perform(get("/api/v1/goals").header("Authorization","Bearer "+login.accessToken())).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content("{\"email\":\""+email+"\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }
}
