package com.budgetplanner.auth.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "user_accounts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 60)
    private String passwordHash;

    public UserAccount(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }
}
