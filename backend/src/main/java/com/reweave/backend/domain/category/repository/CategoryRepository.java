package com.reweave.backend.domain.category.repository;

import com.reweave.backend.domain.category.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    // 내 카테고리인지까지 한 번에 확인
    Optional<Category> findByIdAndUserId(Long id, Long userId);

    // 내 카테고리 목록 (정렬 순서대로)
    List<Category> findAllByUserIdOrderBySortOrderAscIdAsc(Long userId);

    // 이름 중복 확인
    boolean existsByUserIdAndCategoryName(Long userId, String categoryName);

    // 수정 시: 나 자신은 빼고 이름 중복 확인
    boolean existsByUserIdAndCategoryNameAndIdNot(Long userId, String categoryName, Long id);

    // 새 카테고리를 맨 앞에 넣기 위해 기존 카테고리 순서를 하나씩 뒤로
    @Modifying(flushAutomatically = true)
    @Query("update Category c set c.sortOrder = c.sortOrder + 1 where c.user.id = :userId")
    int shiftSortOrders(@Param("userId") Long userId);

    // 카테고리 삭제 시 목적그룹의 참조 카테고리 연결 해제
    @Modifying(flushAutomatically = true)
    @Query("update PurposeGroup p set p.categoryId = null where p.userId = :userId and p.categoryId = :categoryId")
    int clearPurposeGroupCategory(@Param("userId") Long userId, @Param("categoryId") Long categoryId);

    // 카테고리 삭제 시 목적그룹의 참조 카테고리 연결 행 삭제
    @Modifying(flushAutomatically = true)
    @Query("delete from PurposeGroupCategory pgc where pgc.categoryId = :categoryId")
    int deletePurposeGroupCategoryLinks(@Param("categoryId") Long categoryId);
}