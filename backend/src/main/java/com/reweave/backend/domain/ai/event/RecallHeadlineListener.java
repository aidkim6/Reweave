package com.reweave.backend.domain.ai.event;

import com.reweave.backend.domain.ai.service.AiService;
import com.reweave.backend.domain.purposegroup.service.PurposeGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class RecallHeadlineListener {

    private final AiService aiService;
    private final PurposeGroupService purposeGroupService;

    // 그룹 저장 트랜잭션이 커밋된 뒤에 별도 스레드에서 실행 (생성 API 응답을 지연시키지 않음)
    @Async("aiExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handle(PurposeGroupHeadlineRequestedEvent event) {
        aiService.generateRecallHeadline(event.purposeName())
                .ifPresent(headline -> purposeGroupService.updateRecallHeadline(
                        event.purposeGroupId(), event.purposeName(), headline));
    }
}