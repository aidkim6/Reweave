package com.reweave.backend.domain.ai.controller;

import com.reweave.backend.domain.ai.dto.AiRecallResponse;
import com.reweave.backend.domain.ai.dto.AiRecommendRequest;
import com.reweave.backend.domain.ai.dto.AiRecommendResponse;
import com.reweave.backend.domain.ai.service.AiService;
import com.reweave.backend.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    // 목적 그룹 북마크 AI 자동 매칭 API
    @PostMapping("/recommend")
    public ResponseEntity<ApiResponse<AiRecommendResponse>> recommendBookmarks(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody AiRecommendRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(aiService.recommendBookmarksForPurpose(userId, request)));
    }

    // 오늘의 링크 AI 리콜 목록 조회 API
    @GetMapping("/recalls")
    public ResponseEntity<ApiResponse<List<AiRecallResponse>>> getTodayRecalls(
            @AuthenticationPrincipal Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(aiService.getTodayRecalls(userId)));
    }
}