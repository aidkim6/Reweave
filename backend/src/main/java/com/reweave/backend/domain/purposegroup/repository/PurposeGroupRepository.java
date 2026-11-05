package com.reweave.backend.domain.purposegroup.repository;

import com.reweave.backend.domain.purposegroup.entity.PurposeGroup;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PurposeGroupRepository extends JpaRepository<PurposeGroup, Long> {

    List<PurposeGroup> findAllByUserId(Long userId);

    Optional<PurposeGroup> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);

    List<PurposeGroup> findByUserIdAndStatusOrderByCreatedDateDesc(Long userId, PurposeGroupStatus status);
}
