package com.reweave.backend.domain.category.dto;

import java.util.List;

public record CategoryCountResponse(long count, List<String> thumbnails) {
}