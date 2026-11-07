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

    // 목적 그룹 내 북마크 검색: 제목·요약·카테고리명 부분 일치 (북마크 검색과 같은 규칙)
    @Query(value = """
            select pgb from PurposeGroupBookmark pgb
            join fetch pgb.bookmark b
            left join fetch b.category c
            where pgb.purposeGroup.id = :purposeGroupId
              and b.deletedDate is null
              and (lower(b.title) like lower(concat('%', :keyword, '%'))
                or lower(b.summary) like lower(concat('%', :keyword, '%'))
                or lower(c.categoryName) like lower(concat('%', :keyword, '%')))
            """,
            countQuery = """
            select count(pgb) from PurposeGroupBookmark pgb
            join pgb.bookmark b
            left join b.category c
            where pgb.purposeGroup.id = :purposeGroupId
              and b.deletedDate is null
              and (lower(b.title) like lower(concat('%', :keyword, '%'))
                or lower(b.summary) like lower(concat('%', :keyword, '%'))
                or lower(c.categoryName) like lower(concat('%', :keyword, '%')))
            """)
    Page<PurposeGroupBookmark> searchByPurposeGroupId(@Param("purposeGroupId") Long purposeGroupId,
                                                      @Param("keyword") String keyword,
                                                      Pageable pageable);

    // 해당 목적 그룹에 이미 매핑된 북마크 ID 목록 한 번에 조회
    @Query("SELECT pgb.bookmark.id FROM PurposeGroupBookmark pgb WHERE pgb.purposeGroup.id = :purposeGroupId")
    Set<Long> findBookmarkIdsByPurposeGroupId(@Param("purposeGroupId") Long purposeGroupId);

    // 여러 목적 그룹에 저장된, 삭제되지 않은 북마크를 한 번에 조회 (홈 화면 리콜 카드용)
    @Query("SELECT pgb FROM PurposeGroupBookmark pgb JOIN FETCH pgb.bookmark b " +
            "WHERE pgb.purposeGroup.id IN :groupIds AND b.deletedDate IS NULL")
    List<PurposeGroupBookmark> findActiveByPurposeGroupIds(@Param("groupIds") Collection<Long> groupIds);

    // ===== 프로젝트 카드용 (카테고리 카드와 같은 방식) =====

    // 프로젝트별 북마크 개수 (삭제된 것 제외)
    interface PurposeGroupBookmarkCount {
        Long getPurposeGroupId();

        Long getCount();
    }

    @Query("""
            select pgb.purposeGroup.id as purposeGroupId, count(pgb) as count
            from PurposeGroupBookmark pgb join pgb.bookmark b
            where pgb.purposeGroup.id in :purposeGroupIds and b.deletedDate is null
            group by pgb.purposeGroup.id
            """)
    List<PurposeGroupBookmarkCount> countActiveByPurposeGroupIds(@Param("purposeGroupIds") Collection<Long> purposeGroupIds);

    // 썸네일 (그룹에 추가한 최신순, 썸네일 없는 링크 제외, 개수는 Pageable로 제한)
    @Query("""
            select b.thumbnailUrl from PurposeGroupBookmark pgb join pgb.bookmark b
            where pgb.purposeGroup.id = :purposeGroupId
              and b.deletedDate is null and b.thumbnailUrl is not null
            order by pgb.createdDate desc, pgb.id desc
            """)
    List<String> findThumbnailsByPurposeGroupId(@Param("purposeGroupId") Long purposeGroupId, Pageable pageable);

    // 이 북마크를 담고 있는 목적 그룹 ID (링크 상세의 "저장된 프로젝트")
    @Query("SELECT pgb.purposeGroup.id FROM PurposeGroupBookmark pgb WHERE pgb.bookmark.id = :bookmarkId")
    Set<Long> findPurposeGroupIdsByBookmarkId(@Param("bookmarkId") Long bookmarkId);

    // 목적 그룹 삭제 시 연관 매핑 데이터 일괄 삭제
    void deleteAllByPurposeGroupId(Long purposeGroupId);

    // 특정 목적 그룹 내 특정 북마크들 삭제
    void deleteAllByPurposeGroupIdAndBookmarkIdIn(Long purposeGroupId, List<Long> bookmarkIds);

    // 출발지 그룹 내 개수를 조회
    long countByPurposeGroupIdAndBookmarkIdIn(Long purposeGroupId, List<Long> bookmarkIds);
}