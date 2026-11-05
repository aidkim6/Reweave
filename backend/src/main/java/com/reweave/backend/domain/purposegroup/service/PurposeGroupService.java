package com.reweave.backend.domain.purposegroup.service;

import com.reweave.backend.domain.ai.event.PurposeGroupHeadlineRequestedEvent;
import com.reweave.backend.domain.bookmark.entity.Bookmark;
import com.reweave.backend.domain.bookmark.repository.BookmarkRepository;
import com.reweave.backend.domain.category.repository.CategoryRepository;
import com.reweave.backend.domain.purposegroup.dto.*;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroup;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupBookmark;
import com.reweave.backend.domain.purposegroup.repository.PurposeGroupBookmarkRepository;
import com.reweave.backend.domain.purposegroup.repository.PurposeGroupRepository;
import com.reweave.backend.global.exception.CustomException;
import com.reweave.backend.global.exception.ErrorCode;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class PurposeGroupService {

    private final PurposeGroupRepository purposeGroupRepository;
    private final CategoryRepository categoryRepository;
    private final PurposeGroupBookmarkRepository purposeGroupBookmarkRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ApplicationEventPublisher eventPublisher;

    public PurposeGroupService(PurposeGroupRepository purposeGroupRepository,
                               CategoryRepository categoryRepository,
                               PurposeGroupBookmarkRepository purposeGroupBookmarkRepository,
                               BookmarkRepository bookmarkRepository,
                               ApplicationEventPublisher eventPublisher) {
        this.purposeGroupRepository = purposeGroupRepository;
        this.categoryRepository = categoryRepository;
        this.purposeGroupBookmarkRepository = purposeGroupBookmarkRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.eventPublisher = eventPublisher;
    }

    // 목적 그룹 생성
    @Transactional
    public PurposeGroupResponse create(Long userId, PurposeGroupCreateRequest request) {
        if (request.categoryId() != null) {
            validateCategoryOwnership(request.categoryId(), userId);
        }

        PurposeGroup purposeGroup = new PurposeGroup(
                userId,
                request.purposeName().trim(),
                request.status(),
                request.categoryId()
        );
        PurposeGroup saved = purposeGroupRepository.save(purposeGroup);

        // 커밋 후 백그라운드에서 추천문구 생성 (응답은 기다리지 않음)
        eventPublisher.publishEvent(
                new PurposeGroupHeadlineRequestedEvent(saved.getId(), saved.getPurposeName()));

        return PurposeGroupResponse.from(saved);
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

    // 목적 그룹 목록 조회
    public List<PurposeGroupResponse> findAll(Long userId) {
        return purposeGroupRepository.findAllByUserId(userId)
                .stream()
                .map(PurposeGroupResponse::from)
                .toList();
    }

    // 목적 그룹 상세 조회
    public PurposeGroupResponse findById(Long userId, Long purposeGroupId) {
        PurposeGroup purposeGroup = purposeGroupRepository.findByIdAndUserId(purposeGroupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND));

        return PurposeGroupResponse.from(purposeGroup);
    }

    // 목적 그룹 이름 수정
    @Transactional
    public PurposeGroupResponse update(Long userId, Long purposeGroupId, PurposeGroupUpdateRequest request) {
        if (request.categoryId() != null) {
            validateCategoryOwnership(request.categoryId(), userId);
        }

        PurposeGroup purposeGroup = purposeGroupRepository.findByIdAndUserId(purposeGroupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND));

        String previousName = purposeGroup.getPurposeName();
        purposeGroup.update(request.purposeName().trim(), request.categoryId());
        purposeGroupRepository.flush();

        // 이름이 바뀌었으면 추천문구를 새로 생성
        if (!previousName.equals(purposeGroup.getPurposeName())) {
            purposeGroup.updateRecallHeadline(null);
            eventPublisher.publishEvent(
                    new PurposeGroupHeadlineRequestedEvent(purposeGroup.getId(), purposeGroup.getPurposeName()));
        }

        return PurposeGroupResponse.from(purposeGroup);
    }

    // 진행 상태 변경
    @Transactional
    public PurposeGroupResponse updateStatus(Long userId, Long purposeGroupId, PurposeGroupStatusRequest request) {
        PurposeGroup purposeGroup = purposeGroupRepository.findByIdAndUserId(purposeGroupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND));

        purposeGroup.updateStatus(request.status());
        purposeGroupRepository.flush();
        return PurposeGroupResponse.from(purposeGroup);
    }

    // 목적 그룹 삭제
    @Transactional
    public void delete(Long userId, Long purposeGroupId) {
        PurposeGroup purposeGroup = purposeGroupRepository.findByIdAndUserId(purposeGroupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND));

        purposeGroupBookmarkRepository.deleteAllByPurposeGroupId(purposeGroupId);

        purposeGroupRepository.delete(purposeGroup);
    }

    // 카테고리 소유권 검증 메서드
    private void validateCategoryOwnership(Long categoryId, Long userId) {
        categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.CATEGORY_NOT_FOUND));
    }

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

    // 목적 그룹 내 북마크 목록 페이징 조회
    public Page<PurposeGroupBookmarkResponse> findBookmarks(Long userId, Long purposeGroupId, Pageable pageable) {
        if (!purposeGroupRepository.existsByIdAndUserId(purposeGroupId, userId)) {
            throw new CustomException(ErrorCode.PURPOSE_GROUP_NOT_FOUND);
        }

        return purposeGroupBookmarkRepository
                .findByPurposeGroupIdAndBookmarkDeletedDateIsNull(purposeGroupId, pageable)
                .map(pgb -> PurposeGroupBookmarkResponse.from(pgb.getBookmark()));
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