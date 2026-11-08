package com.reweave.backend.domain.bookmark.event;

public record BookmarkCreatedEvent(Long bookmarkId, Long userId) {
}