package com.reweave.backend.domain.bookmark.controller;

import com.reweave.backend.domain.bookmark.dto.*;
import com.reweave.backend.domain.bookmark.service.BookmarkService;
import com.reweave.backend.global.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    // 북마크 저장
    @PostMapping
    public ResponseEntity<ApiResponse<BookmarkCreateResponse>> create(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody BookmarkCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(bookmarkService.create(userId, request)));
    }

    // 북마크 목록 조회
    @GetMapping
    public ResponseEntity<ApiResponse<BookmarkPageResponse<BookmarkSummaryResponse>>> findAll(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "false") boolean uncategorized,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                bookmarkService.findAll(userId, categoryId, uncategorized, sort, page, size)));
    }

    // 북마크 검색
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<BookmarkPageResponse<BookmarkSummaryResponse>>> search(
            @AuthenticationPrincipal Long userId,
            @RequestParam String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                bookmarkService.search(userId, keyword, categoryId, sort, page, size)));
    }

    // 최근 삭제된 링크 목록
    @GetMapping("/trash")
    public ResponseEntity<ApiResponse<BookmarkPageResponse<BookmarkTrashResponse>>> findTrash(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookmarkService.findTrash(userId, sort, page, size)));
    }

    // 북마크 상세 조회
    @GetMapping("/{bookmarkId}")
    public ResponseEntity<ApiResponse<BookmarkDetailResponse>> findById(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookmarkId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookmarkService.findById(userId, bookmarkId)));
    }

    // 북마크 수정
    @PatchMapping("/{bookmarkId}")
    public ResponseEntity<ApiResponse<BookmarkIdResponse>> update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookmarkId,
            @Valid @RequestBody BookmarkUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookmarkService.update(userId, bookmarkId, request)));
    }

    // 북마크 여러 개 이동
    @PatchMapping("/category")
    public ResponseEntity<ApiResponse<Void>> move(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody BookmarkMoveRequest request
    ) {
        bookmarkService.move(userId, request);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // 북마크 삭제 (소프트)
    @DeleteMapping("/{bookmarkId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookmarkId
    ) {
        bookmarkService.delete(userId, bookmarkId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // 북마크 여러 개 삭제 (소프트)
    @PostMapping("/delete")
    public ResponseEntity<ApiResponse<Void>> deleteAll(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody BookmarkIdsRequest request
    ) {
        bookmarkService.deleteAll(userId, request);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // 영구 삭제
    @DeleteMapping("/trash/{bookmarkId}")
    public ResponseEntity<ApiResponse<Void>> deletePermanently(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookmarkId
    ) {
        bookmarkService.deletePermanently(userId, bookmarkId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // 여러 개 영구 삭제
    @PostMapping("/trash/delete")
    public ResponseEntity<ApiResponse<Void>> deleteAllPermanently(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody BookmarkIdsRequest request
    ) {
        bookmarkService.deleteAllPermanently(userId, request);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // 열람 기록
    @PostMapping("/{bookmarkId}/view")
    public ResponseEntity<ApiResponse<Void>> recordView(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookmarkId
    ) {
        bookmarkService.recordView(userId, bookmarkId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // 분석 상태 조회
    @GetMapping("/{bookmarkId}/status")
    public ResponseEntity<ApiResponse<BookmarkStatusResponse>> getStatus(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long bookmarkId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookmarkService.getStatus(userId, bookmarkId)));
    }
}