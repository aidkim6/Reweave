package com.reweave.backend.domain.category.dto;

import com.reweave.backend.domain.category.entity.Category;

import java.util.List;

public record CategoryResponse(
        Long categoryId,
        String categoryName,
        String description,
        long bookmarkCount,
        List<String> thumbnails
) {

    public static CategoryResponse of(Category category, long bookmarkCount, List<String> thumbnails) {
        return new CategoryResponse(
                category.getId(),
                category.getCategoryName(),
                category.getDescription(),
                bookmarkCount,
                thumbnails
        );
    }
}