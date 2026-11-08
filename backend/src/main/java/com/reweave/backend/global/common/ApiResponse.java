package com.reweave.backend.global.common;

import com.reweave.backend.global.exception.ErrorCode;

/**
 * 공통 응답 형식
 * 성공: { "success": true,  "code": "SUCCESS", "message": "요청 성공", "data": {...} }
 * 실패: { "success": false, "code": "DUPLICATE_EMAIL", "message": "...", "data": null }
 */
public record ApiResponse<T>(boolean success, String code, String message, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, "SUCCESS", "요청 성공", data);
    }

    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(true, "SUCCESS", "요청 성공", null);
    }

    public static ApiResponse<Void> fail(ErrorCode errorCode) {
        return new ApiResponse<>(false, errorCode.name(), errorCode.getMessage(), null);
    }

    public static ApiResponse<Void> fail(ErrorCode errorCode, String message) {
        return new ApiResponse<>(false, errorCode.name(), message, null);
    }
}