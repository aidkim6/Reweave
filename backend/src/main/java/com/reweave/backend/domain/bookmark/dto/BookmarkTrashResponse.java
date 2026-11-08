package com.reweave.backend.domain.bookmark.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.reweave.backend.domain.bookmark.entity.Bookmark;
import com.reweave.backend.domain.bookmark.support.UrlNormalizer;

import java.time.LocalDateTime;

public record BookmarkTrashResponse(
        Long bookmarkId,
        String title,
        String thumbnailUrl,
        String domain,
        String categoryName,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime createdDate,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime deletedDate
) {

    public static BookmarkTrashResponse from(Bookmark b) {
        return new BookmarkTrashResponse(
                b.getId(),
                b.getTitle(),
                b.getThumbnailUrl(),
                UrlNormalizer.domain(b.getUrl()),
                b.getCategory() == null ? null : b.getCategory().getCategoryName(),
                b.getCreatedDate(),
                b.getDeletedDate()
        );
    }
}