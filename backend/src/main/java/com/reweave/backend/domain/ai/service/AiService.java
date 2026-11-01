package com.reweave.backend.domain.ai.service;

import com.reweave.backend.domain.ai.dto.AiRecommendRequest;
import com.reweave.backend.domain.ai.dto.AiRecommendResponse;
import com.reweave.backend.domain.bookmark.entity.Bookmark;
import com.reweave.backend.domain.bookmark.repository.BookmarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.*;
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
    private final WebClient webClient = WebClient.create();

    // 입력 토큰 폭주 방지용 북마크 최대 개수 및 요약 글자수 제약
    private static final int MAX_CANDIDATE_BOOKMARKS = 50;
    private static final int MAX_SUMMARY_LENGTH = 150;

    public AiRecommendResponse recommendBookmarksForPurpose(Long userId, AiRecommendRequest request) {
        // 1. 카테고리 내 북마크 1차 조회
        List<Bookmark> targetBookmarks = bookmarkRepository.findByUserIdAndCategoryIdInAndDeletedDateIsNull(userId, request.categoryIds());

        if (targetBookmarks.isEmpty()) {
            return new AiRecommendResponse(List.of(), "선택하신 카테고리에 저장된 북마크가 없습니다.");
        }

        // 후보 북마크가 너무 많을 경우 최근 N개로 제한 (성능 및 토큰 절약)
        if (targetBookmarks.size() > MAX_CANDIDATE_BOOKMARKS) {
            targetBookmarks = targetBookmarks.subList(0, MAX_CANDIDATE_BOOKMARKS);
        }

        // 유효한 후보 ID Set 구축 (AI가 환각/인젝션으로 다른 유저 ID를 반환하는 것 방지)
        Set<Long> validCandidateIds = targetBookmarks.stream()
                .map(Bookmark::getId)
                .collect(Collectors.toSet());

        // 2. 프롬프트용 북마크 데이터 생성 (null 처리 및 길이 자르기)
        String bookmarkDataText = targetBookmarks.stream()
                .map(b -> {
                    String rawSummary = b.getSummary() != null ? b.getSummary() : "";
                    String truncatedSummary = rawSummary.length() > MAX_SUMMARY_LENGTH
                            ? rawSummary.substring(0, MAX_SUMMARY_LENGTH) + "..."
                            : rawSummary;
                    return String.format("[ID: %d] 제목: %s, 설명: %s", b.getId(), b.getTitle(), truncatedSummary);
                })
                .collect(Collectors.joining("\n"));

        // 3. Gemini Prompt
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

        // 4. Gemini API 호출
        Map response;
        try {
            response = webClient.post()
                    .uri(apiUrl)
                    .header("x-goog-api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

        } catch (WebClientResponseException e) {
            log.error("Gemini API 호출 실패 status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            HttpStatus status = e.getStatusCode().is5xxServerError()
                    ? HttpStatus.SERVICE_UNAVAILABLE
                    : HttpStatus.BAD_GATEWAY;
            throw new ResponseStatusException(status, "AI 서비스 호출에 실패했습니다.");
        } catch (Exception e) {
            log.error("Gemini API 통신 또는 파싱 오류 발생", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "AI 연동 처리 중 오류가 발생했습니다.");
        }

        // 5. 응답 파싱 및 검증
        String rawResult = parseGeminiResponse(response);
        List<Long> matchedIds = extractAndValidateBookmarkIds(rawResult, validCandidateIds);
        String cleanedReason = extractReasonText(rawResult);

        return new AiRecommendResponse(matchedIds, cleanedReason);
    }

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

    // AI가 반환한 ID 중 실제 후보 목록에 존재하는 ID만 추출 (Security Validation)
    private List<Long> extractAndValidateBookmarkIds(String text, Set<Long> validCandidateIds) {
        List<Long> ids = new ArrayList<>();

        // '추천 ID:' 라인 우선 탐색
        Pattern pattern = Pattern.compile("추천\\s*ID\\s*:\\s*\\[(.*?)\\]");
        Matcher matcher = pattern.matcher(text);

        if (!matcher.find()) {
            // 차선책으로 일반 대괄호 탐색
            pattern = Pattern.compile("\\[(.*?)\\]");
            matcher = pattern.matcher(text);
        }

        if (matcher.find()) {
            String idGroup = matcher.group(1);
            String[] split = idGroup.split(",");
            for (String s : split) {
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

    // 이유 부분 텍스트만 추출
    private String extractReasonText(String text) {
        if (text == null) return "";
        int reasonIndex = text.indexOf("이유:");
        if (reasonIndex != -1) {
            return text.substring(reasonIndex + 3).trim();
        }
        return text.trim();
    }
}