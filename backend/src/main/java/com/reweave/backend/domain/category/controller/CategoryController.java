package com.reweave.backend.domain.category.controller;

import com.reweave.backend.domain.category.dto.*;
import com.reweave.backend.domain.category.service.CategoryService;
import com.reweave.backend.global.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    // 카테고리 생성
    @PostMapping
    public ResponseEntity<ApiResponse<CategoryIdResponse>> create(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CategoryCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(categoryService.create(userId, request)));
    }

    // 내 카테고리 목록
    @GetMapping
    public ResponseEntity<ApiResponse<CategoryListResponse>> findAll(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.findAll(userId)));
    }

    // 기본 카테고리 조회 (전체 / 미분류 / 최근 삭제된 링크)
    @GetMapping("/default")
    public ResponseEntity<ApiResponse<DefaultCategoryResponse>> findDefault(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.findDefault(userId)));
    }

    // 카테고리 순서 변경
    @PatchMapping("/order")
    public ResponseEntity<ApiResponse<Void>> changeOrder(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CategoryOrderRequest request
    ) {
        categoryService.changeOrder(userId, request);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // 카테고리 수정
    @PatchMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<CategoryIdResponse>> update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long categoryId,
            @Valid @RequestBody CategoryUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.update(userId, categoryId, request)));
    }

    // 카테고리 삭제 (안의 북마크는 미분류로 이동)
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long categoryId
    ) {
        categoryService.delete(userId, categoryId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}