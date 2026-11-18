package com.budgetplanner.category.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "categories")
public class Category {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "owner_id", updatable = false)
	private Long ownerId;

	@Column(nullable = false, length = 100)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private CategoryType type;

	@Setter(AccessLevel.NONE)
	@Column(name = "standard_code", length = 32, updatable = false)
	private String standardCode;

	@Setter(AccessLevel.NONE)
	@Column(name = "archived_at")
	private Instant archivedAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public boolean isStandard() {
		return standardCode != null;
	}

	public void archive(Instant archivedAt) {
		if (this.archivedAt == null) {
			this.archivedAt = archivedAt;
		}
	}

	@PrePersist
	void onCreate() {
		if(createdAt == null) {
			createdAt = Instant.now();
		}
	}
}
