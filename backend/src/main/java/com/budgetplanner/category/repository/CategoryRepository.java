package com.budgetplanner.category.repository;

import com.budgetplanner.category.entity.Category;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    String VISIBLE_TO_OWNER = "(c.ownerId = :ownerId or c.standardCode is not null)";

    @Query("select c from Category c where " + VISIBLE_TO_OWNER
            + " and (:includeArchived = true or c.archivedAt is null) order by c.id")
    List<Category> findVisible(@Param("ownerId") Long ownerId, @Param("includeArchived") boolean includeArchived);

    @Query("select c from Category c where c.id = :id and " + VISIBLE_TO_OWNER)
    Optional<Category> findVisibleById(@Param("ownerId") Long ownerId, @Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Category c where c.id = :id and " + VISIBLE_TO_OWNER)
    Optional<Category> findVisibleForUpdate(@Param("ownerId") Long ownerId, @Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select c from Category c where c.id = :id and " + VISIBLE_TO_OWNER)
    Optional<Category> findVisibleForAssignment(@Param("ownerId") Long ownerId, @Param("id") Long id);
}
