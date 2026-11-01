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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

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

    private static final int MAX_CANDIDATE_BOOKMARKS = 50;
    private static final int MAX_SUMMARY_LENGTH = 150;

    public AiRecommendResponse recommendBookmarksForPurpose(Long userId, AiRecommendRequest request) {
        // 1. DB 레벨에서 최신순 상위 50개만 조회
        Pageable pageable = PageRequest.of(0, MAX_CANDIDATE_BOOKMARKS);
        List<Bookmark> targetBookmarks = bookmarkRepository
                .findByUserIdAndCategoryIdInAndDeletedDateIsNullOrderByIdDesc(userId, request.categoryIds(), pageable);

        if (targetBookmarks.isEmpty()) {
            return new AiRecommendResponse(List.of(), "선택하신 카테고리에 저장된 북마크가 없습니다.");
        }

        Set<Long> validCandidateIds = targetBookmarks.stream()
                .map(Bookmark::getId)
                .collect(Collectors.toSet());

        // 2. 프롬프트용 북마크 데이터 생성
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

    // ID 매칭 추출 로직 수정 (find() 중복 소모 방지)
    private List<Long> extractAndValidateBookmarkIds(String text, Set<Long> validCandidateIds) {
        List<Long> ids = new ArrayList<>();
        if (text == null || text.isBlank()) return ids;

        // 우선 '추천 ID:' 뒤의 대괄호 구문 탐색
        Pattern primaryPattern = Pattern.compile("추천\\s*ID\\s*:\\s*\\[(.*?)\\]");
        Matcher matcher = primaryPattern.matcher(text);

        String idGroup = null;
        if (matcher.find()) {
            idGroup = matcher.group(1);
        } else {
            // 실패 시 일반 대괄호 탐색 (매치 포인터 재설정)
            Pattern fallbackPattern = Pattern.compile("\\[(.*?)\\]");
            Matcher fallbackMatcher = fallbackPattern.matcher(text);
            if (fallbackMatcher.find()) {
                idGroup = fallbackMatcher.group(1);
            }
        }

        if (idGroup != null) {
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

    private String extractReasonText(String text) {
        if (text == null) return "";
        int reasonIndex = text.indexOf("이유:");
        if (reasonIndex != -1) {
            return text.substring(reasonIndex + 3).trim();
        }
        return text.trim();
    }
}