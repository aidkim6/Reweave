package com.reweave.backend.domain.category.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CategoryOrderRequest(
        @NotNull(message = "카테고리 순서를 입력해주세요.")
        List<@NotNull Long> categoryIds
) {
}