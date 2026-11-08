package com.reweave.backend.domain.purposegroup.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PurposeGroupBookmarkAddRequest(
        @NotEmpty(message = "추가할 북마크를 선택해주세요.")
        List<@NotNull Long> bookmarkIds
) {
}
