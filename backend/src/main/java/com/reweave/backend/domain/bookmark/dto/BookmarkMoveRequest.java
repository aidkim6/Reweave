package com.reweave.backend.domain.bookmark.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BookmarkMoveRequest(
        @NotEmpty(message = "이동할 북마크를 선택해주세요.")
        List<@NotNull Long> bookmarkIds,

        @NotNull(message = "이동할 카테고리를 선택해주세요.")
        Long categoryId
) {
}