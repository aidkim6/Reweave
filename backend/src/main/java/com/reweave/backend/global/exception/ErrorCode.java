package com.reweave.backend.global.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    // 공통
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),

    // 유저
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 가입된 이메일입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 아이디입니다."),
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "비밀번호를 다시 입력해주세요."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    EXPIRED_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "만료된 토큰입니다. 다시 로그인해주세요."),

    // 카테고리
    CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "카테고리를 찾을 수 없습니다."),
    DUPLICATE_CATEGORY_NAME(HttpStatus.CONFLICT, "이미 있는 카테고리입니다."),
    INVALID_CATEGORY_ORDER(HttpStatus.BAD_REQUEST, "카테고리 순서 정보가 올바르지 않습니다."),

    // 북마크
    INVALID_URL(HttpStatus.BAD_REQUEST, "URL 형식이 올바르지 않습니다."),
    BOOKMARK_NOT_FOUND(HttpStatus.NOT_FOUND, "북마크를 찾을 수 없습니다."),
    DUPLICATE_BOOKMARK(HttpStatus.CONFLICT, "이미 저장된 링크입니다."),
    NOT_IN_TRASH(HttpStatus.BAD_REQUEST, "삭제되지 않은 북마크입니다."),

    // 목적 그룹
    PURPOSE_GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "목적 그룹을 찾을 수 없습니다."),
    INVALID_PURPOSE_GROUP_ORDER(HttpStatus.BAD_REQUEST, "목적 그룹 순서 정보가 올바르지 않습니다.");
    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}