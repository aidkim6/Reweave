package com.reweave.backend.domain.ai.dto;

public record AiRecallResponse(
        Long projectId,
        String projectTitle,
        Long bookmarkId,
        String bookmarkTitle,
        String thumbnailUrl,
        String url,
        String recommendReason
) {}