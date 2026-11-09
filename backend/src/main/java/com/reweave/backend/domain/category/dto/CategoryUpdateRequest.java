package com.reweave.backend.domain.category.dto;

import jakarta.validation.constraints.Size;

// 보낸 필드만 수정 (null = 안 보냄)
public record CategoryUpdateRequest(
        @Size(max = 255, message = "카테고리 이름은 255자 이하로 입력해주세요.")
        String categoryName,

        @Size(max = 255, message = "설명은 255자 이하로 입력해주세요.")
        String description
) {
}