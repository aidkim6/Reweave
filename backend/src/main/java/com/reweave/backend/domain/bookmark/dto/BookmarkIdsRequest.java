package com.reweave.backend.domain.bookmark.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BookmarkIdsRequest(
        @NotEmpty(message = "북마크를 선택해주세요.")
        List<@NotNull Long> bookmarkIds
) {
}