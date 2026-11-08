package com.reweave.backend.domain.purposegroup.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PurposeGroupUpdateRequest(
        @NotBlank(message = "목적 그룹 이름은 필수입니다.")
        String purposeName,

        // 기존 단일 카테고리 (호환용, categoryIds가 없을 때만 사용)
        Long categoryId,

        // 참조 카테고리 여러 개: 생략(null)하면 기존 유지, 빈 배열이면 전부 해제
        List<@NotNull Long> categoryIds
) {

        // 참조 카테고리를 바꾸라는 요청인지 (둘 다 없으면 기존 값 유지)
        public boolean hasCategoryChange() {
                return categoryIds != null || categoryId != null;
        }

        // categoryIds가 우선이고, 없으면 categoryId를 하나짜리 목록으로 사용
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