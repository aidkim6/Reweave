package com.reweave.backend.domain.purposegroup.controller;

import com.reweave.backend.domain.bookmark.dto.BookmarkPageResponse;
import com.reweave.backend.domain.purposegroup.dto.*;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupStatus;
import com.reweave.backend.domain.purposegroup.service.PurposeGroupService;
import com.reweave.backend.global.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


import java.util.List;

@RestController
@RequestMapping("/api/purpose-groups")
public class PurposeGroupController {

    private final PurposeGroupService purposeGroupService;

    public PurposeGroupController(PurposeGroupService purposeGroupService) {
        this.purposeGroupService = purposeGroupService;
    }

    // 목적 그룹 생성
    @PostMapping
    public ResponseEntity<ApiResponse<PurposeGroupResponse>> create(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PurposeGroupCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(purposeGroupService.create(userId, request)));
    }

    // 목적 그룹 목록 조회 (정렬 순서대로, 모든 파라미터는 선택)
    // status: 진행 상태 / categoryIds: 하나라도 참조하는 프로젝트(예: categoryIds=1,2)
    // bookmarkId: 이 북마크를 담은 프로젝트 / keyword: 프로젝트 이름 또는 참조 카테고리 이름 검색
    @GetMapping
    public ResponseEntity<ApiResponse<List<PurposeGroupResponse>>> findAll(
            @AuthenticationPrincipal Long userId,
            @RequestParam(name = "status", required = false) PurposeGroupStatus status,
            @RequestParam(name = "categoryIds", required = false) List<Long> categoryIds,
            @RequestParam(name = "bookmarkId", required = false) Long bookmarkId,
            @RequestParam(name = "keyword", required = false) String keyword
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                purposeGroupService.findAll(userId, status, categoryIds, bookmarkId, keyword)));
    }

    // 목적 그룹 순서 변경 (내 목적 그룹 ID 전체를 원하는 순서대로 전달)
    @PatchMapping("/order")
    public ResponseEntity<ApiResponse<Void>> changeOrder(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PurposeGroupOrderRequest request
    ) {
        purposeGroupService.changeOrder(userId, request);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // 목적 그룹 상세 조회
    @GetMapping("/{purposeGroupId}")
    public ResponseEntity<ApiResponse<PurposeGroupResponse>> findById(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long purposeGroupId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(purposeGroupService.findById(userId, purposeGroupId)));
    }

    // 목적 그룹 수정 (이름, 참조 카테고리)
    @PatchMapping("/{purposeGroupId}")
    public ResponseEntity<ApiResponse<PurposeGroupResponse>> update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long purposeGroupId,
            @Valid @RequestBody PurposeGroupUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(purposeGroupService.update(userId, purposeGroupId, request)));
    }

    // 목적 그룹 진행 상태 변경
    @PatchMapping("/{purposeGroupId}/status")
    public ResponseEntity<ApiResponse<PurposeGroupResponse>> updateStatus(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long purposeGroupId,
            @Valid @RequestBody PurposeGroupStatusRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(purposeGroupService.updateStatus(userId, purposeGroupId, request)));
    }

    // 목적 그룹 삭제
    @DeleteMapping("/{purposeGroupId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long purposeGroupId
    ) {
        purposeGroupService.delete(userId, purposeGroupId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/{purposeGroupId}/bookmarks")
    public ResponseEntity<ApiResponse<Void>> addBookmarks(
            @AuthenticationPrincipal Long userId,
            @PathVariable("purposeGroupId") Long purposeGroupId,
            @Valid @RequestBody PurposeGroupBookmarkAddRequest request
    ) {
        purposeGroupService.addBookmarks(userId, purposeGroupId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok());
    }

    // 목적 그룹 내 북마크 목록 페이징 조회
    // keyword: 있으면 제목·요약·카테고리명 검색 / sort: latest(기본), oldest (그룹에 추가한 시점 기준)
    @GetMapping("/{purposeGroupId}/bookmarks")
    public ResponseEntity<ApiResponse<BookmarkPageResponse<PurposeGroupBookmarkResponse>>> getBookmarks(
            @AuthenticationPrincipal Long userId,
            @PathVariable("purposeGroupId") Long purposeGroupId,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "sort", defaultValue = "latest") String sort,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size
    ) {
        Page<PurposeGroupBookmarkResponse> result =
                purposeGroupService.findBookmarks(userId, purposeGroupId, keyword, sort, page, size);
        return ResponseEntity.ok(ApiResponse.ok(BookmarkPageResponse.of(result)));
    }

    // 목적 그룹 내 북마크 삭제
    @DeleteMapping("/{purposeGroupId}/bookmarks")
    public ResponseEntity<ApiResponse<Void>> removeBookmarks(
            @AuthenticationPrincipal Long userId,   // expression = "principal" 제거
            @PathVariable("purposeGroupId") Long purposeGroupId,
            @Valid @RequestBody PurposeGroupBookmarkDeleteRequest request
    ) {
        purposeGroupService.removeBookmarks(userId, purposeGroupId, request);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    // 목적 그룹 간 북마크 이동
    @PutMapping("/{purposeGroupId}/bookmarks/move")
    public ResponseEntity<ApiResponse<Void>> moveBookmarks(
            @AuthenticationPrincipal Long userId,   // expression = "principal" 제거
            @PathVariable("purposeGroupId") Long purposeGroupId,
            @Valid @RequestBody PurposeGroupBookmarkMoveRequest request
    ) {
        purposeGroupService.moveBookmarks(userId, purposeGroupId, request);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}