package com.reweave.backend.domain.bookmark.dto;

import com.reweave.backend.domain.bookmark.entity.AnalysisStatus;

public record BookmarkCreateResponse(Long bookmarkId, AnalysisStatus analysisStatus) {
}