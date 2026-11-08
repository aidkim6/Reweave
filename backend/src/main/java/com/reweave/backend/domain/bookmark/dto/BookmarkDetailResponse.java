package com.reweave.backend.domain.bookmark.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.reweave.backend.domain.bookmark.entity.AnalysisStatus;
import com.reweave.backend.domain.bookmark.entity.Bookmark;
import com.reweave.backend.domain.bookmark.support.UrlNormalizer;

import java.time.LocalDateTime;

public record BookmarkDetailResponse(
        Long bookmarkId,
        String url,
        String domain,
        String title,
        String thumbnailUrl,
        String memo,
        String summary,
        Long categoryId,
        String categoryName,
        AnalysisStatus analysisStatus,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime createdDate
) {

    public static BookmarkDetailResponse from(Bookmark b) {
        return new BookmarkDetailResponse(
                b.getId(),
                b.getUrl(),
                UrlNormalizer.domain(b.getUrl()),
                b.getTitle(),
                b.getThumbnailUrl(),
                b.getMemo(),
                b.getSummary(),
                b.getCategory() == null ? null : b.getCategory().getId(),
                b.getCategory() == null ? null : b.getCategory().getCategoryName(),
                b.getAnalysisStatus(),
                b.getCreatedDate()
        );
    }
}