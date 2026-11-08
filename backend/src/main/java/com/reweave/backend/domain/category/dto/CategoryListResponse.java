package com.reweave.backend.domain.category.dto;

import java.util.List;

public record CategoryListResponse(List<CategoryResponse> categories) {
}