package com.reweave.backend.domain.bookmark.support;

public record PageMetadata(String title, String content, String thumbnailUrl) {

    public static PageMetadata empty() {
        return new PageMetadata(null, null, null);
    }
}