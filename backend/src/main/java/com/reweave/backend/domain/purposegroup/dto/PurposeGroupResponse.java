package com.reweave.backend.domain.purposegroup.dto;

import com.reweave.backend.domain.purposegroup.entity.PurposeGroup;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupStatus;

import java.time.LocalDateTime;
import java.util.List;

public record PurposeGroupResponse(
        Long purposeGroupId,
        Long userId,
        Long categoryId,
        String purposeName,
        PurposeGroupStatus status,
        LocalDateTime createdDate,
        LocalDateTime modifiedDate,
        List<CategoryTag> categories,
        long bookmarkCount,
        List<String> thumbnails
) {

    // 프로젝트가 참조하는 카테고리 (카드 태그, 수정 화면의 선택 상태)
    public record CategoryTag(Long categoryId, String categoryName) {
    }

    public static PurposeGroupResponse of(PurposeGroup purposeGroup,
                                          List<CategoryTag> categories,
                                          long bookmarkCount,
                                          List<String> thumbnails) {
        // 기존 필드 호환: categoryId는 참조 카테고리 중 첫 번째 (연결 데이터가 없으면 기존 컬럼 값)
        Long firstCategoryId = categories.isEmpty()
                ? purposeGroup.getCategoryId()
                : categories.get(0).categoryId();

        return new PurposeGroupResponse(
                purposeGroup.getId(),
                purposeGroup.getUserId(),
                firstCategoryId,
                purposeGroup.getPurposeName(),
                purposeGroup.getStatus(),
                purposeGroup.getCreatedDate(),
                purposeGroup.getModifiedDate(),
                categories,
                bookmarkCount,
                thumbnails
        );
    }

    public static PurposeGroupResponse from(PurposeGroup purposeGroup) {
        return of(purposeGroup, List.of(), 0L, List.of());
    }
}