package com.reweave.backend.domain.bookmark.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record BookmarkPageResponse<T>(
        List<T> bookmarks,
        int page,
        int size,
        long totalElements,
        boolean hasNext
) {

    public static <T> BookmarkPageResponse<T> of(Page<T> page) {
        return new BookmarkPageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.hasNext()
        );
    }
}