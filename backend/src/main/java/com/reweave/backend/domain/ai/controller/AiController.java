package com.reweave.backend.domain.ai.controller;

import com.reweave.backend.domain.ai.dto.AiRecommendRequest;
import com.reweave.backend.domain.ai.dto.AiRecommendResponse;
import com.reweave.backend.domain.ai.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "ai-controller", description = "Gemini AI 기반 목적 그룹 매칭 API")
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @Operation(summary = "프로젝트 목적 및 카테고리 기반 북마크 AI 매칭", description = "선택된 참조 카테고리 내의 북마크 중 프로젝트 제목과 연관된 북마크를 AI가 추천합니다.")
    @PostMapping("/recommend")
    public ResponseEntity<AiRecommendResponse> getRecommendation(
            @AuthenticationPrincipal Long userId, // SecurityContext에서 유저 PK 추출
            @Valid @RequestBody AiRecommendRequest request
    ) {
        AiRecommendResponse response = aiService.recommendBookmarksForPurpose(userId, request);
        return ResponseEntity.ok(response);
    }
}