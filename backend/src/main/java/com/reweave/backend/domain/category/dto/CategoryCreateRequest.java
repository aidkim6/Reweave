package com.reweave.backend.domain.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryCreateRequest(
        @NotBlank(message = "카테고리 이름을 입력해주세요.")
        @Size(max = 255, message = "카테고리 이름은 255자 이하로 입력해주세요.")
        String categoryName,

        @Size(max = 255, message = "설명은 255자 이하로 입력해주세요.")
        String description
) {
}