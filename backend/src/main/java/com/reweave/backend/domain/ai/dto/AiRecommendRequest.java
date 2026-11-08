package com.reweave.backend.domain.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AiRecommendRequest(
        @NotBlank(message = "프로젝트 목적을 입력해주세요.")
        @Size(max = 200, message = "프로젝트 목적은 200자 이하로 입력해주세요.")
        String purposeTitle,

        @NotEmpty(message = "카테고리를 최소 하나 이상 선택해주세요.")
        List<Long> categoryIds
) {}