package com.reweave.backend.domain.bookmark.repository;

import com.reweave.backend.domain.bookmark.entity.Bookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    // 삭제 안 된 내 북마크 1개
    @EntityGraph(attributePaths = "category")
    Optional<Bookmark> findByIdAndUserIdAndDeletedDateIsNull(Long id, Long userId);

    // 삭제 여부 상관없이 내 북마크 1개 (영구 삭제용)
    Optional<Bookmark> findByIdAndUserId(Long id, Long userId);

    // 중복 확인 (휴지통 포함)
    Optional<Bookmark> findByUserIdAndUrlHash(Long userId, String urlHash);

    // 목록: 전체 / 카테고리별 / 미분류
    @EntityGraph(attributePaths = "category")
    Page<Bookmark> findByUserIdAndDeletedDateIsNull(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = "category")
    Page<Bookmark> findByUserIdAndCategoryIdAndDeletedDateIsNull(Long userId, Long categoryId, Pageable pageable);

    @EntityGraph(attributePaths = "category")
    Page<Bookmark> findByUserIdAndCategoryIsNullAndDeletedDateIsNull(Long userId, Pageable pageable);

    // 최근 삭제된 링크
    @EntityGraph(attributePaths = "category")
    Page<Bookmark> findByUserIdAndDeletedDateIsNotNull(Long userId, Pageable pageable);

    // 여러 개 처리용
    List<Bookmark> findAllByIdInAndUserIdAndDeletedDateIsNull(Collection<Long> ids, Long userId);

    List<Bookmark> findAllByIdInAndUserId(Collection<Long> ids, Long userId);

    // 검색: 제목·요약·카테고리명 부분 일치
    @Query(value = """
            select b from Bookmark b left join fetch b.category c
            where b.user.id = :userId
              and b.deletedDate is null
              and (:categoryId is null or c.id = :categoryId)
              and (lower(b.title) like lower(concat('%', :keyword, '%'))
                or lower(b.summary) like lower(concat('%', :keyword, '%'))
                or lower(c.categoryName) like lower(concat('%', :keyword, '%')))
            """,
            countQuery = """
            select count(b) from Bookmark b left join b.category c
            where b.user.id = :userId
              and b.deletedDate is null
              and (:categoryId is null or c.id = :categoryId)
              and (lower(b.title) like lower(concat('%', :keyword, '%'))
                or lower(b.summary) like lower(concat('%', :keyword, '%'))
                or lower(c.categoryName) like lower(concat('%', :keyword, '%')))
            """)
    Page<Bookmark> search(@Param("userId") Long userId,
                          @Param("categoryId") Long categoryId,
                          @Param("keyword") String keyword,
                          Pageable pageable);

    // ===== 카테고리 API용 =====

    // 카테고리별 북마크 개수 (삭제된 것 제외)
    interface CategoryCount {
        Long getCategoryId();
        Long getCount();
    }

    @Query("""
            select b.category.id as categoryId, count(b) as count
            from Bookmark b
            where b.user.id = :userId and b.deletedDate is null and b.category is not null
            group by b.category.id
            """)
    List<CategoryCount> countActiveByCategory(@Param("userId") Long userId);

    // 기본 카테고리 개수
    long countByUserIdAndDeletedDateIsNull(Long userId);

    long countByUserIdAndCategoryIsNullAndDeletedDateIsNull(Long userId);

    long countByUserIdAndDeletedDateIsNotNull(Long userId);

    // 썸네일 (최근 저장순, 썸네일 없는 링크 제외, 개수는 Pageable로 제한)
    @Query("""
            select b.thumbnailUrl from Bookmark b
            where b.user.id = :userId and b.category.id = :categoryId
              and b.deletedDate is null and b.thumbnailUrl is not null
            order by b.createdDate desc, b.id desc
            """)
    List<String> findThumbnailsByCategory(@Param("userId") Long userId,
                                          @Param("categoryId") Long categoryId,
                                          Pageable pageable);

    @Query("""
            select b.thumbnailUrl from Bookmark b
            where b.user.id = :userId
              and b.deletedDate is null and b.thumbnailUrl is not null
            order by b.createdDate desc, b.id desc
            """)
    List<String> findThumbnailsAll(@Param("userId") Long userId, Pageable pageable);

    @Query("""
            select b.thumbnailUrl from Bookmark b
            where b.user.id = :userId and b.category is null
              and b.deletedDate is null and b.thumbnailUrl is not null
            order by b.createdDate desc, b.id desc
            """)
    List<String> findThumbnailsUncategorized(@Param("userId") Long userId, Pageable pageable);

    @Query("""
            select b.thumbnailUrl from Bookmark b
            where b.user.id = :userId
              and b.deletedDate is not null and b.thumbnailUrl is not null
            order by b.deletedDate desc, b.id desc
            """)
    List<String> findThumbnailsInTrash(@Param("userId") Long userId, Pageable pageable);

    // 카테고리 삭제 시 안의 북마크를 미분류로 (휴지통 포함)
    @Modifying(flushAutomatically = true)
    @Query("update Bookmark b set b.category = null where b.user.id = :userId and b.category.id = :categoryId")
    int clearCategory(@Param("userId") Long userId, @Param("categoryId") Long categoryId);

    // [AI 추천용] 선택한 카테고리 목록에 속한 삭제 안 된 북마크 최신순 조회 (Pageable로 N개 제한)
    List<Bookmark> findByUserIdAndCategoryIdInAndDeletedDateIsNullOrderByIdDesc(
            Long userId,
            Collection<Long> categoryIds,
            Pageable pageable
    );

    List<Bookmark> findByUserIdAndCategoryIdAndDeletedDateIsNullOrderByIdDesc(Long userId, Long categoryId, Pageable pageable);
    List<Bookmark> findByUserIdAndDeletedDateIsNullOrderByIdDesc(Long userId, Pageable pageable);
}