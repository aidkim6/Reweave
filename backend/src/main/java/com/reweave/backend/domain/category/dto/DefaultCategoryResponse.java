package com.reweave.backend.domain.category.dto;

public record DefaultCategoryResponse(
        CategoryCountResponse all,
        CategoryCountResponse uncategorized,
        CategoryCountResponse trash
) {
}