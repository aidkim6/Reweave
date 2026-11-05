package com.reweave.backend.domain.ai.service;

import com.reweave.backend.domain.ai.dto.AiRecallResponse;
import com.reweave.backend.domain.ai.dto.AiRecommendRequest;
import com.reweave.backend.domain.ai.dto.AiRecommendResponse;
import com.reweave.backend.domain.ai.event.PurposeGroupHeadlineRequestedEvent;
import com.reweave.backend.domain.bookmark.entity.Bookmark;
import com.reweave.backend.domain.bookmark.repository.BookmarkRepository;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroup;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupBookmark;
import com.reweave.backend.domain.purposegroup.entity.PurposeGroupStatus;
import com.reweave.backend.domain.purposegroup.repository.PurposeGroupBookmarkRepository;
import com.reweave.backend.domain.purposegroup.repository.PurposeGroupRepository;
import io.netty.channel.ChannelOption;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import reactor.netty.http.client.HttpClient;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final BookmarkRepository bookmarkRepository;
    private final PurposeGroupRepository purposeGroupRepository;
    private final PurposeGroupBookmarkRepository purposeGroupBookmarkRepository;
    private final ApplicationEventPublisher eventPublisher;

    // 연결 3초, 응답 35초 (개별 호출의 실제 타임아웃은 각 호출부의 .timeout()으로 제어)
    private final WebClient webClient = WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(
                    HttpClient.create()
                            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3000)
                            .responseTimeout(Duration.ofSeconds(35))))
            .build();

    private static final int MAX_CANDIDATE_BOOKMARKS = 200;
    private static final int MAX_SUMMARY_LENGTH = 100;
    private static final int RECOMMEND_TIMEOUT_SECONDS = 30;

    private static final int MAX_RECALL_CARDS = 5;
    private static final int HEADLINE_TIMEOUT_SECONDS = 15;
    private static final int MAX_HEADLINE_LENGTH = 30;
    private static final String DEFAULT_HEADLINE = "오늘 이 링크를 다시 읽어보세요!";

    // ===================== 북마크 추천 (기존 API, 응답 형태 동일) =====================

    public AiRecommendResponse recommendBookmarksForPurpose(Long userId, AiRecommendRequest request) {
        Pageable pageable = PageRequest.of(0, MAX_CANDIDATE_BOOKMARKS);
        List<Bookmark> targetBookmarks = bookmarkRepository
                .findByUserIdAndCategoryIdInAndDeletedDateIsNullOrderByIdDesc(userId, request.categoryIds(), pageable);

        if (targetBookmarks.isEmpty()) {
            return new AiRecommendResponse(List.of(), "선택하신 카테고리에 저장된 북마크가 없습니다.");
        }

        Set<Long> validCandidateIds = targetBookmarks.stream()
                .map(Bookmark::getId)
                .collect(Collectors.toSet());

        String bookmarkDataText = targetBookmarks.stream()
                .map(b -> {
                    String rawSummary = b.getSummary() != null ? b.getSummary() : "";
                    String truncatedSummary = rawSummary.length() > MAX_SUMMARY_LENGTH
                            ? rawSummary.substring(0, MAX_SUMMARY_LENGTH) + "..."
                            : rawSummary;
                    return String.format("[ID: %d] 제목: %s, 설명: %s", b.getId(), b.getTitle(), truncatedSummary);
                })
                .collect(Collectors.joining("\n"));

        String prompt = String.format("""
                당신은 프로젝트 목적에 맞는 북마크를 매칭해주는 AI 컨설턴트입니다.
                
                프로젝트 제목: '%s'
                
                후보 북마크 목록:
                %s
                
                위 후보 북마크 목록 중에서 프로젝트 제목('%s')과 관련성이 높은 북마크의 ID들을 선택해 주세요.
                
                [응답 형식]
                추천 ID: [ID1, ID2, ...] (없다면 [NONE])
                이유: 2줄 이내의 간단한 한국어 설명
                """, request.purposeTitle(), bookmarkDataText, request.purposeTitle());

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );

        Map response;
        long start = System.currentTimeMillis();
        try {
            response = webClient.post()
                    .uri(apiUrl)
                    .header("x-goog-api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .retryWhen(geminiRetrySpec())
                    .timeout(Duration.ofSeconds(RECOMMEND_TIMEOUT_SECONDS))
                    .block();

            log.info("Gemini 북마크 추천 응답 candidates={} elapsed={}ms",
                    targetBookmarks.size(), System.currentTimeMillis() - start);

        } catch (WebClientResponseException e) {
            log.error("Gemini API 호출 실패 status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            HttpStatus status = e.getStatusCode().is5xxServerError()
                    ? HttpStatus.SERVICE_UNAVAILABLE
                    : HttpStatus.BAD_GATEWAY;
            throw new ResponseStatusException(status, "AI 서비스 호출에 실패했습니다.");
        } catch (Exception e) {
            log.error("Gemini API 통신 또는 파싱 오류 발생 elapsed={}ms", System.currentTimeMillis() - start, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "AI 연동 처리 중 오류가 발생했습니다.");
        }

        String rawResult = parseGeminiResponse(response);
        List<Long> matchedIds = extractAndValidateBookmarkIds(rawResult, validCandidateIds);
        String cleanedReason = extractReasonText(rawResult);

        return new AiRecommendResponse(matchedIds, cleanedReason);
    }

    // ===================== 오늘의 링크 AI 리콜 (DB 조회만, AI 호출 없음) =====================

    @Transactional(readOnly = true)
    public List<AiRecallResponse> getTodayRecalls(Long userId) {
        List<PurposeGroup> activeGroups = new ArrayList<>(purposeGroupRepository
                .findByUserIdAndStatusOrderByCreatedDateDesc(userId, PurposeGroupStatus.IN_PROGRESS));

        if (activeGroups.isEmpty()) {
            return List.of();
        }

        // 진행 중인 그룹을 무작위 순서로 섞는다
        Collections.shuffle(activeGroups);

        // 그룹에 저장된 북마크를 한 번에 조회
        List<Long> groupIds = activeGroups.stream().map(PurposeGroup::getId).toList();
        Map<Long, List<Bookmark>> savedByGroup = purposeGroupBookmarkRepository
                .findActiveByPurposeGroupIds(groupIds)
                .stream()
                .collect(Collectors.groupingBy(
                        pgb -> pgb.getPurposeGroup().getId(),
                        Collectors.mapping(PurposeGroupBookmark::getBookmark, Collectors.toList())
                ));

        List<AiRecallResponse> cards = new ArrayList<>();
        for (PurposeGroup group : activeGroups) {
            if (cards.size() >= MAX_RECALL_CARDS) {
                break;
            }

            Bookmark target = pickTargetBookmark(userId, group, savedByGroup.get(group.getId()));
            if (target == null) {
                continue;
            }

            String headline = group.getRecallHeadline();
            if (headline == null || headline.isBlank()) {
                // 아직 추천문구가 없는 그룹(기존 그룹 등): 기본 문구를 쓰고, 다음 호출부터 쓸 문구를 백그라운드로 생성
                headline = DEFAULT_HEADLINE;
                eventPublisher.publishEvent(
                        new PurposeGroupHeadlineRequestedEvent(group.getId(), group.getPurposeName()));
            }

            cards.add(new AiRecallResponse(
                    group.getId(),
                    group.getPurposeName(),
                    target.getId(),
                    target.getTitle(),
                    target.getThumbnailUrl(),
                    target.getUrl(),
                    headline
            ));
        }
        return cards;
    }

    // 그룹에 저장된 북마크 중 랜덤 1개. 저장된 북마크가 없으면 기존처럼 카테고리의 최신 북마크 중 랜덤 1개
    private Bookmark pickTargetBookmark(Long userId, PurposeGroup group, List<Bookmark> savedBookmarks) {
        if (savedBookmarks != null && !savedBookmarks.isEmpty()) {
            return savedBookmarks.get(ThreadLocalRandom.current().nextInt(savedBookmarks.size()));
        }

        List<Bookmark> fallback;
        if (group.getCategoryId() != null) {
            fallback = bookmarkRepository.findByUserIdAndCategoryIdAndDeletedDateIsNullOrderByIdDesc(
                    userId, group.getCategoryId(), PageRequest.of(0, 5));
        } else {
            fallback = bookmarkRepository.findByUserIdAndDeletedDateIsNullOrderByIdDesc(
                    userId, PageRequest.of(0, 5));
        }

        if (fallback.isEmpty()) {
            return null;
        }
        return fallback.get(ThreadLocalRandom.current().nextInt(fallback.size()));
    }

    // ===================== 추천문구 생성 (목적그룹 생성 후 백그라운드에서 호출) =====================

    public Optional<String> generateRecallHeadline(String purposeName) {
        String prompt = String.format("""
                당신은 사용자가 저장해 둔 링크를 다시 읽도록 유도하는 AI 큐레이터입니다.
                
                프로젝트: '%s'
                
                이 프로젝트를 진행 중인 사용자가 오늘 저장해 둔 링크를 다시 보고 싶어지도록 하는
                20자 이내의 한 줄 추천 문구를 작성해 주세요.
                특정 링크를 언급하지 말고, 프로젝트 전체에 어울리는 문구여야 합니다.
                설명이나 따옴표 없이 문구만 출력하세요.
                """, purposeName);

        // 일부 모델은 추론 토큰이 maxOutputTokens에 포함되어 응답이 비어버릴 수 있어서 길이 제한은 코드에서 처리
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );

        long start = System.currentTimeMillis();
        try {
            Map response = webClient.post()
                    .uri(apiUrl)
                    .header("x-goog-api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .retryWhen(geminiRetrySpec())
                    .timeout(Duration.ofSeconds(HEADLINE_TIMEOUT_SECONDS))
                    .block();

            String headline = sanitizeHeadline(parseGeminiResponse(response));
            log.info("Gemini 추천문구 생성 완료 elapsed={}ms", System.currentTimeMillis() - start);

            return headline.isBlank() ? Optional.empty() : Optional.of(headline);
        } catch (Exception e) {
            log.warn("AI 추천문구 생성 실패 purposeName={} elapsed={}ms: {}",
                    purposeName, System.currentTimeMillis() - start, e.getMessage());
            return Optional.empty();
        }
    }

    private String sanitizeHeadline(String raw) {
        if (raw == null) return "";
        String s = raw.replaceAll("[\\r\\n]+", " ")
                .replaceAll("^[\"'\\u201C\\u201D\\u2018\\u2019\\s]+|[\"'\\u201C\\u201D\\u2018\\u2019\\s]+$", "")
                .trim();
        return s.length() > MAX_HEADLINE_LENGTH ? s.substring(0, MAX_HEADLINE_LENGTH) : s;
    }

    // ===================== 공통: 재시도 =====================

    // 일시적인 서버 과부하(503)나 호출 제한(429)일 때만 최대 2번, 1초부터 늘려가며 재시도
    // 재시도를 모두 소진하면 원래 예외(WebClientResponseException)를 그대로 던져서 기존 에러 처리가 유지된다
    private Retry geminiRetrySpec() {
        return Retry.backoff(2, Duration.ofSeconds(1))
                .filter(e -> e instanceof WebClientResponseException w
                        && (w.getStatusCode().value() == 503 || w.getStatusCode().value() == 429))
                .doBeforeRetry(signal -> log.warn("Gemini 재시도 {}회차: {}",
                        signal.totalRetries() + 1, signal.failure().getMessage()))
                .onRetryExhaustedThrow((spec, signal) -> signal.failure());
    }

    // ===================== 공통 파싱 =====================

    private String parseGeminiResponse(Map response) {
        try {
            List candidates = (List) response.get("candidates");
            Map firstCandidate = (Map) candidates.get(0);
            Map content = (Map) firstCandidate.get("content");
            List parts = (List) content.get("parts");
            Map firstPart = (Map) parts.get(0);
            return (String) firstPart.get("text");
        } catch (Exception e) {
            log.error("Gemini 응답 구조 파싱 실패: {}", response, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "AI 응답 결과를 분석할 수 없습니다.");
        }
    }

    private List<Long> extractAndValidateBookmarkIds(String text, Set<Long> validCandidateIds) {
        List<Long> ids = new ArrayList<>();
        if (text == null || text.isBlank()) return ids;

        Pattern primaryPattern = Pattern.compile("추천\\s*ID\\s*:\\s*\\[(.*?)\\]", Pattern.DOTALL);
        Matcher matcher = primaryPattern.matcher(text);

        String idGroup = null;
        if (matcher.find()) {
            idGroup = matcher.group(1);
        } else {
            Pattern fallbackPattern = Pattern.compile("\\[(.*?)\\]", Pattern.DOTALL);
            Matcher fallbackMatcher = fallbackPattern.matcher(text);
            if (fallbackMatcher.find()) {
                idGroup = fallbackMatcher.group(1);
            }
        }

        if (idGroup != null) {
            String[] split = idGroup.split("[,\\s]+");
            for (String s : split) {
                if (s.isBlank()) continue;
                try {
                    Long parsedId = Long.parseLong(s.trim());
                    if (validCandidateIds.contains(parsedId)) {
                        ids.add(parsedId);
                    }
                } catch (NumberFormatException ignored) {}
            }
        }
        return ids;
    }

    private String extractReasonText(String text) {
        if (text == null) return "";
        int reasonIndex = text.indexOf("이유:");
        if (reasonIndex != -1) {
            return text.substring(reasonIndex + 3).trim();
        }
        return text.trim();
    }
}