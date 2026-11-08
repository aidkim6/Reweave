package com.reweave.backend.domain.bookmark.dto;

import com.reweave.backend.domain.bookmark.entity.SaveSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BookmarkCreateRequest(
        @NotBlank(message = "URL을 입력해주세요.")
        String url,

        @Size(max = 255, message = "메모는 255자 이하로 입력해주세요.")
        String memo,

        Long categoryId,

        @NotNull(message = "saveSource(EXTENSION / URL_INPUT)를 입력해주세요.")
        SaveSource saveSource,

        String title,   // EXTENSION만
        String content  // EXTENSION만
) {
}