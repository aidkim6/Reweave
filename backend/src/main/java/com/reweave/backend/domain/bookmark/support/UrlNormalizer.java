package com.reweave.backend.domain.bookmark.support;

import com.reweave.backend.domain.bookmark.entity.ContentType;
import com.reweave.backend.global.exception.CustomException;
import com.reweave.backend.global.exception.ErrorCode;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

/** URL 검증·정규화·해시 (utm 등 추적 파라미터 제거 후 중복 확인) */
public final class UrlNormalizer {

    private static final Set<String> TRACKING_PARAMS = Set.of("fbclid", "gclid", "igshid", "si", "mc_cid", "mc_eid");
    private static final Set<String> YOUTUBE_HOSTS = Set.of("youtube.com", "m.youtube.com", "youtu.be");

    private UrlNormalizer() {
    }

    public static URI parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_URL);
        }
        try {
            URI uri = new URI(raw.trim());
            String scheme = uri.getScheme();
            boolean http = scheme != null && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"));
            if (!http || uri.getHost() == null || uri.toString().length() > 2048) {
                throw new CustomException(ErrorCode.INVALID_URL);
            }
            return uri;
        } catch (URISyntaxException e) {
            throw new CustomException(ErrorCode.INVALID_URL);
        }
    }

    public static String normalize(URI uri) {
        String host = stripWww(uri.getHost().toLowerCase(Locale.ROOT));
        String path = uri.getRawPath() == null ? "" : uri.getRawPath();

        List<String> params = new ArrayList<>();
        if (uri.getRawQuery() != null) {
            for (String p : uri.getRawQuery().split("&")) {
                if (p.isEmpty()) continue;
                String key = p.split("=", 2)[0].toLowerCase(Locale.ROOT);
                if (key.startsWith("utm_") || TRACKING_PARAMS.contains(key)) continue;
                params.add(p);
            }
        }

        // 유튜브 주소 통일: youtu.be/ID, m.youtube.com → youtube.com/watch?v=ID
        if (host.equals("m.youtube.com")) {
            host = "youtube.com";
        }
        if (host.equals("youtu.be") && path.length() > 1) {
            params.add("v=" + path.substring(1));
            host = "youtube.com";
            path = "/watch";
        }

        if (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        if (path.isEmpty()) {
            path = "/";
        }
        Collections.sort(params);

        int port = uri.getPort();
        String portPart = (port == -1 || port == 80 || port == 443) ? "" : ":" + port;

        // http/https는 같은 링크로 취급
        return "https://" + host + portPart + path + (params.isEmpty() ? "" : "?" + String.join("&", params));
    }

    public static String hash(String normalizedUrl) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(normalizedUrl.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static String domain(String url) {
        try {
            String host = URI.create(url).getHost();
            return host == null ? null : stripWww(host.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public static ContentType contentType(URI uri) {
        String host = stripWww(uri.getHost().toLowerCase(Locale.ROOT));
        return YOUTUBE_HOSTS.contains(host) ? ContentType.YOUTUBE : ContentType.WEB;
    }

    private static String stripWww(String host) {
        return host.startsWith("www.") ? host.substring(4) : host;
    }
}