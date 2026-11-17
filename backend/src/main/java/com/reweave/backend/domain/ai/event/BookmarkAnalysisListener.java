package com.reweave.backend.domain.ai.event;

import com.reweave.backend.domain.ai.dto.AiBookmarkAnalysisResult;
import com.reweave.backend.domain.ai.service.AiService;
import com.reweave.backend.domain.bookmark.event.BookmarkCreatedEvent;
import com.reweave.backend.domain.bookmark.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookmarkAnalysisListener {

    private final AiService aiService;
    private final BookmarkService bookmarkService;

    // 북마크 저장 트랜잭션이 커밋된 뒤에 별도 스레드에서 실행 (저장 API 응답을 지연시키지 않음)
    @Async("aiExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handle(BookmarkCreatedEvent event) {
        try {
            Optional<AiBookmarkAnalysisResult> result =
                    aiService.analyzeBookmark(event.bookmarkId(), event.userId());

            if (result.isPresent()) {
                AiBookmarkAnalysisResult r = result.get();
                bookmarkService.applyAnalysisResult(event.bookmarkId(), event.userId(), r.summary(), r.categoryId());
            } else {
                bookmarkService.markAnalysisFailed(event.bookmarkId());
            }
        } catch (Exception e) {
            log.error("북마크 AI 분석 처리 중 예외 발생 bookmarkId={}", event.bookmarkId(), e);
            bookmarkService.markAnalysisFailed(event.bookmarkId());
        }
    }
}
