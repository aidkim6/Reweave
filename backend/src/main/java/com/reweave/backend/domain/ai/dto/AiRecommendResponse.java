package com.reweave.backend.domain.ai.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public record AiRecommendResponse(
        @Schema(description = "목적과 관련성이 높은 추천 북마크 ID 목록")
        List<Long> matchedBookmarkIds,

        @Schema(description = "AI 추천 이유 및 분석 요약")
        String reason
) {}
