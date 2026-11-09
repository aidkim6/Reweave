package com.reweave.backend.domain.bookmark.support;

import com.reweave.backend.domain.bookmark.entity.ContentType;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;

/**
 * 링크에서 제목·본문·썸네일 추출
 * 실패해도 예외를 던지지 않고 빈 값 반환 → 링크+제목만으로 저장
 */
@Component
public class PageMetadataExtractor {

    private static final Logger log = LoggerFactory.getLogger(PageMetadataExtractor.class);

    private static final String USER_AGENT = "Mozilla/5.0 (compatible; ReweaveBot/1.0)";
    private static final int TIMEOUT_MILLIS = 5000;
    private static final int MAX_BODY_BYTES = 2 * 1024 * 1024;
    private static final int MAX_REDIRECTS = 3;
    private static final int MAX_CONTENT_LENGTH = 50_000;

    public PageMetadata extract(String url, ContentType contentType) {
        try {
            String current = url;
            for (int i = 0; i <= MAX_REDIRECTS; i++) {
                URI uri = URI.create(current);
                // 내부망 주소 요청 차단 (SSRF 방지)
                if (!isHttp(uri) || !isPublicHost(uri.getHost())) {
                    return PageMetadata.empty();
                }
                Connection.Response res = Jsoup.connect(current)
                        .userAgent(USER_AGENT)
                        .timeout(TIMEOUT_MILLIS)
                        .maxBodySize(MAX_BODY_BYTES)
                        .followRedirects(false) // 리다이렉트도 직접 검사
                        .ignoreHttpErrors(true)
                        .execute();

                int code = res.statusCode();
                if (code >= 300 && code < 400 && res.hasHeader("Location")) {
                    current = uri.resolve(res.header("Location")).toString();
                    continue;
                }
                if (code >= 400) {
                    return PageMetadata.empty();
                }
                return fromDocument(res.parse(), contentType);
            }
        } catch (Exception e) {
            log.warn("메타데이터 추출 실패: {} ({})", url, e.getMessage());
        }
        return PageMetadata.empty();
    }

    private PageMetadata fromDocument(Document doc, ContentType contentType) {
        String title = firstNonBlank(meta(doc, "og:title"), doc.title());
        String thumbnail = metaAbsUrl(doc, "og:image");
        String description = meta(doc, "og:description");

        String content;
        if (contentType == ContentType.YOUTUBE) {
            content = description; // 유튜브 본문 텍스트는 의미 없음 → 설명 사용
        } else {
            doc.select("script, style, noscript, nav, header, footer, iframe, svg").remove();
            String body = doc.body() != null ? doc.body().text() : null;
            content = firstNonBlank(body, description);
        }
        if (content != null && content.length() > MAX_CONTENT_LENGTH) {
            content = content.substring(0, MAX_CONTENT_LENGTH);
        }
        if (thumbnail != null && thumbnail.length() > 2048) {
            thumbnail = null;
        }
        return new PageMetadata(title, content, thumbnail);
    }

    private String meta(Document doc, String key) {
        Element el = doc.selectFirst("meta[property=\"" + key + "\"], meta[name=\"" + key + "\"]");
        return el == null ? null : blankToNull(el.attr("content"));
    }

    private String metaAbsUrl(Document doc, String key) {
        Element el = doc.selectFirst("meta[property=\"" + key + "\"], meta[name=\"" + key + "\"]");
        return el == null ? null : blankToNull(el.absUrl("content"));
    }

    private boolean isHttp(URI uri) {
        String s = uri.getScheme();
        return s != null && (s.equalsIgnoreCase("http") || s.equalsIgnoreCase("https"));
    }

    private boolean isPublicHost(String host) throws UnknownHostException {
        if (host == null) return false;
        for (InetAddress a : InetAddress.getAllByName(host)) {
            if (a.isLoopbackAddress() || a.isSiteLocalAddress() || a.isLinkLocalAddress()
                    || a.isAnyLocalAddress() || a.isMulticastAddress()) {
                return false;
            }
        }
        return true;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }

    private static String blankToNull(String v) {
        return (v == null || v.isBlank()) ? null : v.trim();
    }
}