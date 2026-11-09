package com.reweave.backend.domain.purposegroup.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record PurposeGroupBookmarkMoveRequest(
        @NotNull(message = "목적지 그룹 ID는 필수입니다.")
        Long targetPurposeGroupId,

        @NotEmpty(message = "이동할 북마크 ID 목록은 필수입니다.")
        List<Long> bookmarkIds
) {
}
