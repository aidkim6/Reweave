package com.reweave.backend.domain.ai.dto;

// 북마크 AI 분석 결과 (요약 + 자동분류 카테고리ID, 카테고리는 못 찾으면 null)
public record AiBookmarkAnalysisResult(String summary, Long categoryId) {
}
