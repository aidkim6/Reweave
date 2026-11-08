package com.reweave.backend.domain.bookmark.dto;

import com.reweave.backend.domain.bookmark.entity.AnalysisStatus;
import com.reweave.backend.domain.bookmark.entity.Bookmark;

public record BookmarkStatusResponse(
        Long bookmarkId,
        AnalysisStatus analysisStatus,
        String summary,
        Long categoryId,
        String categoryName
) {

    public static BookmarkStatusResponse from(Bookmark b) {
        return new BookmarkStatusResponse(
                b.getId(),
                b.getAnalysisStatus(),
                b.getSummary(),
                b.getCategory() == null ? null : b.getCategory().getId(),
                b.getCategory() == null ? null : b.getCategory().getCategoryName()
        );
    }
}