package com.budgetplanner.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI budgetPlannerOpenAPI() {
        return new OpenAPI().info(new Info()
                .title("Планировщик бюджета API")
                .version("v1")
                .description("REST API for income and expense categories and transactions"));
    }
}
