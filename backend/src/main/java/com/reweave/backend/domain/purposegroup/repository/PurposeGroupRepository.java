package com.reweave.backend.domain.purposegroup.repository;

import com.reweave.backend.domain.purposegroup.entity.PurposeGroup;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PurposeGroupRepository extends JpaRepository<PurposeGroup, Long> {

    List<PurposeGroup> findAllByUserId(Long userId);

    // 내 목적 그룹 목록 (정렬 순서대로, 순서가 같으면 최근 생성 순)
    List<PurposeGroup> findAllByUserIdOrderBySortOrderAscIdDesc(Long userId);

    Optional<PurposeGroup> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);

    List<PurposeGroup> findByUserIdAndStatusOrderByCreatedDateDesc(Long userId, PurposeGroupStatus status);

    // 새 목적 그룹을 맨 앞에 넣기 위해 기존 그룹의 순서를 하나씩 뒤로
    @Modifying(flushAutomatically = true)
    @Query("update PurposeGroup p set p.sortOrder = p.sortOrder + 1 where p.userId = :userId")
    int shiftSortOrders(@Param("userId") Long userId);
}