package com.reweave.backend.domain.ai.event;

// 목적그룹의 추천문구 생성이 필요할 때 발행하는 이벤트
public record PurposeGroupHeadlineRequestedEvent(Long purposeGroupId, String purposeName) {
}