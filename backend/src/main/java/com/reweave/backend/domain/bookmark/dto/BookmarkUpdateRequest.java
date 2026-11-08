package com.reweave.backend.domain.bookmark.dto;

import jakarta.validation.constraints.Size;

// 보낸 필드만 수정 (null = 안 보냄)
public record BookmarkUpdateRequest(
        @Size(max = 500, message = "제목은 500자 이하로 입력해주세요.")
        String title,

        @Size(max = 255, message = "메모는 255자 이하로 입력해주세요.")
        String memo,

        Long categoryId
) {
}