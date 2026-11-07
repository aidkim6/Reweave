package com.reweave.backend.domain.purposegroup.service;

import com.reweave.backend.domain.ai.event.PurposeGroupHeadlineRequestedEvent;
import com.reweave.backend.domain.bookmark.entity.Bookmark;
import com.reweave.backend.domain.bookmark.repository.BookmarkRepository;
import com.reweave.backend.domain.category.repository.CategoryRepository;
import com.reweave.backend.domain.purposegroup.dto.*;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroup;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupBookmark;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupCategory;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupStatus;
import com.reweave.backend.domain.purposegroup.repository.PurposeGroupBookmarkRepository;
import com.reweave.backend.domain.purposegroup.repository.PurposeGroupCategoryRepository;
import com.reweave.backend.domain.purposegroup.repository.PurposeGroupRepository;
import com.reweave.backend.global.exception.CustomException;
import com.reweave.backend.global.exception.ErrorCode;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PurposeGroupService {

    // 프로젝트 카드 썸네일 콜라주는 최대 4개
    private static final Pageable THUMBNAIL_LIMIT = PageRequest.of(0, 4);
    private static final int MAX_PAGE_SIZE = 100;

    private final PurposeGroupRepository purposeGroupRepository;
    private final PurposeGroupCategoryRepository purposeGroupCategoryRepository;
    private final CategoryRepository categoryRepository;
    private final PurposeGroupBookmarkRepository purposeGroupBookmarkRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ApplicationEventPublisher eventPublisher;

    public PurposeGroupService(PurposeGroupRepository purposeGroupRepository,
                               PurposeGroupCategoryRepository purposeGroupCategoryRepository,
                               CategoryRepository categoryRepository,
                               PurposeGroupBookmarkRepository purposeGroupBookmarkRepository,
                               BookmarkRepository bookmarkRepository,
                               ApplicationEventPublisher eventPublisher) {
        this.purposeGroupRepository = purposeGroupRepository;
        this.purposeGroupCategoryRepository = purposeGroupCategoryRepository;
        this.categoryRepository = categoryRepository;
        this.purposeGroupBookmarkRepository = purposeGroupBookmarkRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.eventPublisher = eventPublisher;
    }

    // 목적 그룹 생성: 목록 맨 앞(sort_order 0)에 추가
    @Transactional
    public PurposeGroupResponse create(Long userId, PurposeGroupCreateRequest request) {
        List<Long> categoryIds = request.resolveCategoryIds();
        validateCategoriesOwnership(categoryIds, userId);

        // 기존 그룹의 순서를 하나씩 뒤로 밀고, 새 그룹은 sortOrder 0(기본값)으로 저장
        purposeGroupRepository.shiftSortOrders(userId);

        PurposeGroup purposeGroup = new PurposeGroup(
                userId,
                request.purposeName().trim(),
                request.status(),
                firstOrNull(categoryIds)
        );
        PurposeGroup saved = purposeGroupRepository.save(purposeGroup);
        replaceCategories(saved.getId(), categoryIds);

        // 커밋 후 백그라운드에서 추천문구 생성 (응답은 기다리지 않음)
        eventPublisher.publishEvent(
                new PurposeGroupHeadlineRequestedEvent(saved.getId(), saved.getPurposeName()));

        return toResponse(saved);
    }

    // 추천문구 저장 (백그라운드 리스너에서 호출)
    @Transactional
    public void updateRecallHeadline(Long purposeGroupId, String expectedPurposeName, String headline) {
        purposeGroupRepository.findById(purposeGroupId).ifPresent(group -> {
            // 문구 생성 중에 그룹 이름이 바뀌었다면 오래된 문구로 덮어쓰지 않는다
            if (group.getPurposeName().equals(expectedPurposeName)) {
                group.updateRecallHeadline(headline);
            }
        });
    }

    // 목적 그룹 목록 조회 (정렬 순서대로, 선택 조건으로 거르기)
    // status: 진행 상태 / categoryIds: 하나라도 참조하는 프로젝트 / bookmarkId: 이 북마크를 담은 프로젝트
    // keyword: 프로젝트 이름 또는 참조 카테고리 이름에 대소문자 구분 없이 부분 일치
    public List<PurposeGroupResponse> findAll(Long userId,
                                              PurposeGroupStatus status,
                                              List<Long> categoryIds,
                                              Long bookmarkId,
                                              String keyword) {
        List<PurposeGroup> groups = purposeGroupRepository.findAllByUserIdOrderBySortOrderAscIdDesc(userId);
        if (groups.isEmpty()) {
            return List.of();
        }

        List<Long> groupIds = groups.stream().map(PurposeGroup::getId).toList();
        Map<Long, List<PurposeGroupResponse.CategoryTag>> tagsByGroup = loadTags(groupIds);
        Map<Long, Long> countsByGroup = loadCounts(groupIds);

        Set<Long> groupIdsWithBookmark = bookmarkId == null
                ? null
                : purposeGroupBookmarkRepository.findPurposeGroupIdsByBookmarkId(bookmarkId);
        Set<Long> wantedCategoryIds = (categoryIds == null || categoryIds.isEmpty())
                ? null
                : new HashSet<>(categoryIds);
        String normalizedKeyword = (keyword == null || keyword.isBlank())
                ? null
                : keyword.trim().toLowerCase(Locale.ROOT);

        return groups.stream()
                .filter(g -> status == null || g.getStatus() == status)
                .filter(g -> groupIdsWithBookmark == null || groupIdsWithBookmark.contains(g.getId()))
                .filter(g -> wantedCategoryIds == null
                        || tagsByGroup.getOrDefault(g.getId(), List.of()).stream()
                        .anyMatch(tag -> wantedCategoryIds.contains(tag.categoryId())))
                .filter(g -> normalizedKeyword == null
                        || g.getPurposeName().toLowerCase(Locale.ROOT).contains(normalizedKeyword)
                        || tagsByGroup.getOrDefault(g.getId(), List.of()).stream()
                        .anyMatch(tag -> tag.categoryName().toLowerCase(Locale.ROOT).contains(normalizedKeyword)))
                .map(g -> buildResponse(g, tagsByGroup, countsByGroup))
                .toList();
    }

    // 목적 그룹 상세 조회
    public PurposeGroupResponse findById(Long userId, Long purposeGroupId) {
        PurposeGroup purposeGroup = purposeGroupRepository.findByIdAndUserId(purposeGroupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND));

        return toResponse(purposeGroup);
    }

    // 목적 그룹 수정 (이름, 참조 카테고리)
    @Transactional
    public PurposeGroupResponse update(Long userId, Long purposeGroupId, PurposeGroupUpdateRequest request) {
        boolean categoryChanged = request.hasCategoryChange();
        List<Long> categoryIds = request.resolveCategoryIds();
        if (categoryChanged) {
            validateCategoriesOwnership(categoryIds, userId);
        }

        PurposeGroup purposeGroup = purposeGroupRepository.findByIdAndUserId(purposeGroupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND));

        String previousName = purposeGroup.getPurposeName();
        purposeGroup.update(request.purposeName().trim(), null);

        if (categoryChanged) {
            purposeGroup.updateCategoryId(firstOrNull(categoryIds));
            replaceCategories(purposeGroupId, categoryIds);
        }
        purposeGroupRepository.flush();

        // 이름이 바뀌었으면 이전 이름 기준 문구를 비우고 새로 생성
        if (!previousName.equals(purposeGroup.getPurposeName())) {
            purposeGroup.updateRecallHeadline(null);
            eventPublisher.publishEvent(
                    new PurposeGroupHeadlineRequestedEvent(purposeGroup.getId(), purposeGroup.getPurposeName()));
        }

        return toResponse(purposeGroup);
    }

    // 진행 상태 변경
    @Transactional
    public PurposeGroupResponse updateStatus(Long userId, Long purposeGroupId, PurposeGroupStatusRequest request) {
        PurposeGroup purposeGroup = purposeGroupRepository.findByIdAndUserId(purposeGroupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND));

        purposeGroup.updateStatus(request.status());
        purposeGroupRepository.flush();
        return toResponse(purposeGroup);
    }

    // 목적 그룹 순서 변경: 내 목적 그룹 전체를 빠짐없이, 중복 없이 받아야 함
    @Transactional
    public void changeOrder(Long userId, PurposeGroupOrderRequest request) {
        List<Long> ids = request.purposeGroupIds();
        List<PurposeGroup> myGroups = purposeGroupRepository.findAllByUserIdOrderBySortOrderAscIdDesc(userId);

        Set<Long> requestIds = new HashSet<>(ids);
        Set<Long> myIds = myGroups.stream().map(PurposeGroup::getId).collect(Collectors.toSet());

        if (requestIds.size() != ids.size() || !requestIds.equals(myIds)) {
            throw new CustomException(ErrorCode.INVALID_PURPOSE_GROUP_ORDER);
        }

        Map<Long, PurposeGroup> byId = myGroups.stream()
                .collect(Collectors.toMap(PurposeGroup::getId, Function.identity()));
        for (int i = 0; i < ids.size(); i++) {
            byId.get(ids.get(i)).changeSortOrder(i);
        }
    }

    // 목적 그룹 삭제
    @Transactional
    public void delete(Long userId, Long purposeGroupId) {
        PurposeGroup purposeGroup = purposeGroupRepository.findByIdAndUserId(purposeGroupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND));

        purposeGroupBookmarkRepository.deleteAllByPurposeGroupId(purposeGroupId);
        purposeGroupCategoryRepository.deleteByPurposeGroupId(purposeGroupId);

        purposeGroupRepository.delete(purposeGroup);
    }

    // ===================== 참조 카테고리 / 응답 조립 =====================

    /** 참조 카테고리가 모두 내 카테고리인지 count 쿼리 한 번으로 검증한다. 하나라도 아니면 CATEGORY_NOT_FOUND. */
    private void validateCategoriesOwnership(List<Long> categoryIds, Long userId) {
        if (categoryIds.isEmpty()) {
            return;
        }
        List<Long> distinctIds = categoryIds.stream().distinct().toList();
        if (categoryRepository.countByIdInAndUserId(distinctIds, userId) != distinctIds.size()) {
            throw new CustomException(ErrorCode.CATEGORY_NOT_FOUND);
        }
    }

    // 프로젝트의 참조 카테고리를 통째로 교체 (바로 실행되는 삭제 후 저장)
    private void replaceCategories(Long purposeGroupId, List<Long> categoryIds) {
        purposeGroupCategoryRepository.deleteByPurposeGroupId(purposeGroupId);
        if (!categoryIds.isEmpty()) {
            purposeGroupCategoryRepository.saveAll(
                    categoryIds.stream()
                            .map(categoryId -> new PurposeGroupCategory(purposeGroupId, categoryId))
                            .toList()
            );
        }
    }

    /** 목록의 첫 번째 값을 돌려주고, 비어 있으면 null을 돌려준다. */
    private static Long firstOrNull(List<Long> ids) {
        return ids.isEmpty() ? null : ids.get(0);
    }

    // 프로젝트별 참조 카테고리 태그를 한 번에 조회
    private Map<Long, List<PurposeGroupResponse.CategoryTag>> loadTags(List<Long> purposeGroupIds) {
        return purposeGroupCategoryRepository.findTagsByPurposeGroupIds(purposeGroupIds).stream()
                .collect(Collectors.groupingBy(
                        PurposeGroupCategoryRepository.CategoryTagRow::getPurposeGroupId,
                        Collectors.mapping(
                                row -> new PurposeGroupResponse.CategoryTag(row.getCategoryId(), row.getCategoryName()),
                                Collectors.toList()
                        )
                ));
    }

    // 프로젝트별 북마크 개수(삭제된 것 제외)를 한 번에 조회
    private Map<Long, Long> loadCounts(List<Long> purposeGroupIds) {
        return purposeGroupBookmarkRepository.countActiveByPurposeGroupIds(purposeGroupIds).stream()
                .collect(Collectors.toMap(
                        PurposeGroupBookmarkRepository.PurposeGroupBookmarkCount::getPurposeGroupId,
                        PurposeGroupBookmarkRepository.PurposeGroupBookmarkCount::getCount
                ));
    }

    /** 프로젝트 1개의 응답을 조립한다 (참조 카테고리 태그, 북마크 개수, 개수가 있을 때만 썸네일 조회). */
    private PurposeGroupResponse buildResponse(PurposeGroup group,
                                               Map<Long, List<PurposeGroupResponse.CategoryTag>> tagsByGroup,
                                               Map<Long, Long> countsByGroup) {
        List<PurposeGroupResponse.CategoryTag> tags = tagsByGroup.getOrDefault(group.getId(), List.of());
        long count = countsByGroup.getOrDefault(group.getId(), 0L);
        List<String> thumbnails = count == 0
                ? List.of()
                : purposeGroupBookmarkRepository.findThumbnailsByPurposeGroupId(group.getId(), THUMBNAIL_LIMIT);
        return PurposeGroupResponse.of(group, tags, count, thumbnails);
    }

    /** 프로젝트 1개를 응답으로 변환한다 (태그와 개수를 함께 조회). */
    private PurposeGroupResponse toResponse(PurposeGroup group) {
        List<Long> ids = List.of(group.getId());
        return buildResponse(group, loadTags(ids), loadCounts(ids));
    }

    // ===================== 목적 그룹 북마크 =====================

    // 목적 그룹에 북마크 추가
    @Transactional
    public void addBookmarks(Long userId, Long purposeGroupId, PurposeGroupBookmarkAddRequest request) {
        PurposeGroup purposeGroup = purposeGroupRepository.findByIdAndUserId(purposeGroupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND));

        List<Long> distinctBookmarkIds = request.bookmarkIds().stream()
                .distinct()
                .toList();

        List<Bookmark> bookmarks = bookmarkRepository.findAllByIdInAndUserIdAndDeletedDateIsNull(
                distinctBookmarkIds, userId
        );

        if (bookmarks.size() != distinctBookmarkIds.size()) {
            throw new CustomException(ErrorCode.BOOKMARK_NOT_FOUND);
        }

        Set<Long> existingBookmarkIds = purposeGroupBookmarkRepository.findBookmarkIdsByPurposeGroupId(purposeGroupId);

        List<PurposeGroupBookmark> newMappings = bookmarks.stream()
                .filter(b -> !existingBookmarkIds.contains(b.getId()))
                .map(b -> new PurposeGroupBookmark(purposeGroup, b))
                .toList();

        if (!newMappings.isEmpty()) {
            purposeGroupBookmarkRepository.saveAll(newMappings);
        }
    }

    // 목적 그룹 내 북마크 목록 페이징 조회 (keyword가 있으면 검색, sort는 latest/oldest)
    public Page<PurposeGroupBookmarkResponse> findBookmarks(Long userId, Long purposeGroupId,
                                                            String keyword, String sort, int page, int size) {
        if (!purposeGroupRepository.existsByIdAndUserId(purposeGroupId, userId)) {
            throw new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND);
        }

        Pageable pageable = pageable(page, size, sort);
        Page<PurposeGroupBookmark> result = (keyword == null || keyword.isBlank())
                ? purposeGroupBookmarkRepository.findByPurposeGroupIdAndBookmarkDeletedDateIsNull(purposeGroupId, pageable)
                : purposeGroupBookmarkRepository.searchByPurposeGroupId(purposeGroupId, keyword.trim(), pageable);

        return result.map(pgb -> PurposeGroupBookmarkResponse.from(pgb.getBookmark()));
    }

    // 북마크 목록과 같은 규칙: sort는 latest/oldest, size는 1~100 (그룹에 추가한 시점 기준 정렬)
    private Pageable pageable(int page, int size, String sort) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        Sort.Direction direction = switch (sort.toLowerCase(Locale.ROOT)) {
            case "latest" -> Sort.Direction.DESC;
            case "oldest" -> Sort.Direction.ASC;
            default -> throw new CustomException(ErrorCode.INVALID_INPUT);
        };
        return PageRequest.of(page, size, Sort.by(direction, "createdDate").and(Sort.by(direction, "id")));
    }

    // 목적 그룹 내 북마크 삭제 (매핑 해제)
    @Transactional
    public void removeBookmarks(Long userId, Long purposeGroupId, PurposeGroupBookmarkDeleteRequest request) {
        if (!purposeGroupRepository.existsByIdAndUserId(purposeGroupId, userId)) {
            throw new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND);
        }

        List<Long> distinctBookmarkIds = request.bookmarkIds().stream()
                .distinct()
                .toList();

        purposeGroupBookmarkRepository.deleteAllByPurposeGroupIdAndBookmarkIdIn(purposeGroupId, distinctBookmarkIds);
    }

    // 목적 그룹 간 북마크 이동
    @Transactional
    public void moveBookmarks(Long userId, Long sourcePurposeGroupId, PurposeGroupBookmarkMoveRequest request) {
        Long targetPurposeGroupId = request.targetPurposeGroupId();

        // 출발지 및 목적지 그룹 소유권 검증
        if (!purposeGroupRepository.existsByIdAndUserId(sourcePurposeGroupId, userId) ||
                !purposeGroupRepository.existsByIdAndUserId(targetPurposeGroupId, userId)) {
            throw new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND);
        }

        List<Long> distinctBookmarkIds = request.bookmarkIds().stream()
                .distinct()
                .toList();

        // 출발지 그룹에 요청한 북마크가 모두 존재하는지 검증
        long validSourceCount = purposeGroupBookmarkRepository.countByPurposeGroupIdAndBookmarkIdIn(
                sourcePurposeGroupId,
                distinctBookmarkIds
        );

        if (validSourceCount != distinctBookmarkIds.size()) {
            throw new CustomException(ErrorCode.BOOKMARK_NOT_FOUND);
        }

        // 출발지 그룹에서 매핑 삭제
        purposeGroupBookmarkRepository.deleteAllByPurposeGroupIdAndBookmarkIdIn(sourcePurposeGroupId, distinctBookmarkIds);

        // 목적지 그룹에 존재하지 않는 신규 북마크만 목적지로 추가 (N+1 방지)
        List<Bookmark> bookmarks = bookmarkRepository.findAllByIdInAndUserIdAndDeletedDateIsNull(
                distinctBookmarkIds, userId
        );

        PurposeGroup targetGroup = purposeGroupRepository.getReferenceById(targetPurposeGroupId);
        Set<Long> existingInTarget = purposeGroupBookmarkRepository.findBookmarkIdsByPurposeGroupId(targetPurposeGroupId);

        List<PurposeGroupBookmark> newMappings = bookmarks.stream()
                .filter(b -> !existingInTarget.contains(b.getId()))
                .map(b -> new PurposeGroupBookmark(targetGroup, b))
                .toList();

        if (!newMappings.isEmpty()) {
            purposeGroupBookmarkRepository.saveAll(newMappings);
        }
    }
}