package com.reweave.backend.domain.purposegroup.repository;

import com.reweave.backend.domain.purposegroup.entity.PurposeGroupBookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface PurposeGroupBookmarkRepository extends JpaRepository<PurposeGroupBookmark, Long> {

    // 목적 그룹 내 삭제 안 된 북마크 목록 페이징 조회
    @EntityGraph(attributePaths = {"bookmark", "bookmark.category"})
    Page<PurposeGroupBookmark> findByPurposeGroupIdAndBookmarkDeletedDateIsNull(Long purposeGroupId, Pageable pageable);

    // 해당 목적 그룹에 이미 매핑된 북마크 ID 목록 한 번에 조회
    @Query("SELECT pgb.bookmark.id FROM PurposeGroupBookmark pgb WHERE pgb.purposeGroup.id = :purposeGroupId")
    Set<Long> findBookmarkIdsByPurposeGroupId(@Param("purposeGroupId") Long purposeGroupId);

    // 여러 목적 그룹에 저장된, 삭제되지 않은 북마크를 한 번에 조회 (홈 화면 리콜 카드용)
    @Query("SELECT pgb FROM PurposeGroupBookmark pgb JOIN FETCH pgb.bookmark b " +
            "WHERE pgb.purposeGroup.id IN :groupIds AND b.deletedDate IS NULL")
    List<PurposeGroupBookmark> findActiveByPurposeGroupIds(@Param("groupIds") Collection<Long> groupIds);

    // 목적 그룹 삭제 시 연관 매핑 데이터 일괄 삭제
    void deleteAllByPurposeGroupId(Long purposeGroupId);

    // 특정 목적 그룹 내 특정 북마크들 삭제
    void deleteAllByPurposeGroupIdAndBookmarkIdIn(Long purposeGroupId, List<Long> bookmarkIds);

    // 출발지 그룹 내 개수를 조회
    long countByPurposeGroupIdAndBookmarkIdIn(Long purposeGroupId, List<Long> bookmarkIds);
}