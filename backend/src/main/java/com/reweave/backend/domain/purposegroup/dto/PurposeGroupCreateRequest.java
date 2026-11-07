package com.reweave.backend.domain.purposegroup.dto;

import com.reweave.backend.domain.purposegroup.entity.PurposeGroupStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PurposeGroupCreateRequest(
        @NotBlank(message = "목적 그룹 이름을 입력해주세요.")
        String purposeName,

        @NotNull(message = "진행 상태를 입력해주세요.")
        PurposeGroupStatus status,

        // 기존 단일 카테고리 (호환용, categoryIds가 없을 때만 사용)
        Long categoryId,

        // 참조 카테고리 여러 개 (선택)
        List<@NotNull Long> categoryIds
) {

        // categoryIds가 우선이고, 없으면 categoryId를 하나짜리 목록으로 사용. 둘 다 없으면 빈 목록
        public List<Long> resolveCategoryIds() {
                if (categoryIds != null) {
                        return categoryIds.stream().distinct().toList();
                }
                if (categoryId != null) {
                        return List.of(categoryId);
                }
                return List.of();
        }
}