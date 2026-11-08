package com.reweave.backend.domain.purposegroup.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record PurposeGroupBookmarkDeleteRequest(
        @NotEmpty(message = "삭제할 북마크 ID 목록은 필수입니다.")
        List<Long> bookmarkIds
) {
}