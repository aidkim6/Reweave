package com.reweave.backend.domain.bookmark.service;

import com.reweave.backend.domain.bookmark.dto.*;
import com.reweave.backend.domain.bookmark.entity.Bookmark;
import com.reweave.backend.domain.bookmark.entity.ContentType;
import com.reweave.backend.domain.bookmark.entity.SaveSource;
import com.reweave.backend.domain.bookmark.event.BookmarkCreatedEvent;
import com.reweave.backend.domain.bookmark.repository.BookmarkRepository;
import com.reweave.backend.domain.bookmark.support.PageMetadata;
import com.reweave.backend.domain.bookmark.support.PageMetadataExtractor;
import com.reweave.backend.domain.bookmark.support.UrlNormalizer;
import com.reweave.backend.domain.category.entity.Category;
import com.reweave.backend.domain.category.repository.CategoryRepository;
import com.reweave.backend.domain.user.repository.UserRepository;
import com.reweave.backend.global.exception.CustomException;
import com.reweave.backend.global.exception.ErrorCode;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class BookmarkService {

    private static final int MAX_PAGE_SIZE = 100;

    private final BookmarkRepository bookmarkRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final PageMetadataExtractor metadataExtractor;
    private final ApplicationEventPublisher eventPublisher;

    public BookmarkService(BookmarkRepository bookmarkRepository,
                           CategoryRepository categoryRepository,
                           UserRepository userRepository,
                           PageMetadataExtractor metadataExtractor,
                           ApplicationEventPublisher eventPublisher) {
        this.bookmarkRepository = bookmarkRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.metadataExtractor = metadataExtractor;
        this.eventPublisher = eventPublisher;
    }

    // 북마크 저장
    @Transactional
    public BookmarkCreateResponse create(Long userId, BookmarkCreateRequest request) {
        URI uri = UrlNormalizer.parse(request.url());
        String url = uri.toString();
        String urlHash = UrlNormalizer.hash(UrlNormalizer.normalize(uri));

        Category category = request.categoryId() == null ? null : findCategory(userId, request.categoryId());

        // 중복 확인: 살아있으면 409, 휴지통에 있으면 영구 삭제 후 새로 저장
        bookmarkRepository.findByUserIdAndUrlHash(userId, urlHash).ifPresent(existing -> {
            if (!existing.isDeleted()) {
                throw new CustomException(ErrorCode.DUPLICATE_BOOKMARK);
            }
            // TODO: 목적그룹_북마크 엔티티가 생기면 연결도 함께 삭제
            bookmarkRepository.deletePurposeGroupLinks(List.of(existing.getId()));
            bookmarkRepository.delete(existing);
            bookmarkRepository.flush(); // 유니크 제약 때문에 insert 전에 delete 먼저 반영
        });

        ContentType contentType = UrlNormalizer.contentType(uri);
        PageMetadata meta = metadataExtractor.extract(url, contentType);
        boolean fromExtension = request.saveSource() == SaveSource.EXTENSION;

        String title = firstNonBlank(
                fromExtension ? request.title() : null,
                meta.title(),
                UrlNormalizer.domain(url),
                url
        );
        String content = firstNonBlank(fromExtension ? request.content() : null, meta.content());

        Bookmark bookmark = new Bookmark(
                userRepository.getReferenceById(userId),
                category,
                url,
                urlHash,
                truncate(title, 500),
                blankToNull(request.memo()),
                content,
                meta.thumbnailUrl(),
                contentType,
                request.saveSource()
        );

        try {
            bookmarkRepository.saveAndFlush(bookmark);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.DUPLICATE_BOOKMARK); // 동시에 같은 링크 저장한 경우
        }

        // AI 분석 시작 신호 (LLM 파트에서 리스너로 받음)
        eventPublisher.publishEvent(new BookmarkCreatedEvent(bookmark.getId(), userId));
        return new BookmarkCreateResponse(bookmark.getId(), bookmark.getAnalysisStatus());
    }

    // 북마크 목록 조회
    public BookmarkPageResponse<BookmarkSummaryResponse> findAll(Long userId, Long categoryId, boolean uncategorized,
                                                                 String sort, int page, int size) {
        if (categoryId != null && uncategorized) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        Pageable pageable = pageable(page, size, sort, "createdDate");

        Page<Bookmark> result;
        if (categoryId != null) {
            findCategory(userId, categoryId);
            result = bookmarkRepository.findByUserIdAndCategoryIdAndDeletedDateIsNull(userId, categoryId, pageable);
        } else if (uncategorized) {
            result = bookmarkRepository.findByUserIdAndCategoryIsNullAndDeletedDateIsNull(userId, pageable);
        } else {
            result = bookmarkRepository.findByUserIdAndDeletedDateIsNull(userId, pageable);
        }
        return BookmarkPageResponse.of(result.map(BookmarkSummaryResponse::from));
    }

    // 북마크 검색
    public BookmarkPageResponse<BookmarkSummaryResponse> search(Long userId, String keyword, Long categoryId,
                                                                String sort, int page, int size) {
        if (keyword == null || keyword.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (categoryId != null) {
            findCategory(userId, categoryId);
        }
        Pageable pageable = pageable(page, size, sort, "createdDate");
        Page<Bookmark> result = bookmarkRepository.search(userId, categoryId, keyword.trim(), pageable);
        return BookmarkPageResponse.of(result.map(BookmarkSummaryResponse::from));
    }

    // 북마크 상세 조회
    public BookmarkDetailResponse findById(Long userId, Long bookmarkId) {
        return BookmarkDetailResponse.from(findActive(userId, bookmarkId));
    }

    // 북마크 수정 (보낸 필드만)
    @Transactional
    public BookmarkIdResponse update(Long userId, Long bookmarkId, BookmarkUpdateRequest request) {
        Bookmark bookmark = findActive(userId, bookmarkId);

        if (request.title() != null) {
            if (request.title().isBlank()) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            bookmark.updateTitle(request.title().trim());
        }
        if (request.memo() != null) {
            bookmark.updateMemo(blankToNull(request.memo())); // "" 보내면 메모 삭제
        }
        if (request.categoryId() != null) {
            bookmark.changeCategory(findCategory(userId, request.categoryId()));
        }
        return new BookmarkIdResponse(bookmark.getId());
    }

    // 여러 개 카테고리 이동 (하나라도 실패하면 전체 취소)
    @Transactional
    public void move(Long userId, BookmarkMoveRequest request) {
        Category category = findCategory(userId, request.categoryId());
        findActiveAll(userId, request.bookmarkIds()).forEach(b -> b.changeCategory(category));
    }

    // 북마크 삭제 (소프트)
    @Transactional
    public void delete(Long userId, Long bookmarkId) {
        findActive(userId, bookmarkId).softDelete();
    }

    // 여러 개 삭제 (소프트)
    @Transactional
    public void deleteAll(Long userId, BookmarkIdsRequest request) {
        findActiveAll(userId, request.bookmarkIds()).forEach(Bookmark::softDelete);
    }

    // 최근 삭제된 링크 목록
    public BookmarkPageResponse<BookmarkTrashResponse> findTrash(Long userId, String sort, int page, int size) {
        Pageable pageable = pageable(page, size, sort, "deletedDate");
        Page<Bookmark> result = bookmarkRepository.findByUserIdAndDeletedDateIsNotNull(userId, pageable);
        return BookmarkPageResponse.of(result.map(BookmarkTrashResponse::from));
    }

    // 영구 삭제
    @Transactional
    public void deletePermanently(Long userId, Long bookmarkId) {
        Bookmark bookmark = bookmarkRepository.findByIdAndUserId(bookmarkId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.BOOKMARK_NOT_FOUND));
        if (!bookmark.isDeleted()) {
            throw new CustomException(ErrorCode.NOT_IN_TRASH);
        }
        // TODO: 목적그룹_북마크 연결 삭제
        bookmarkRepository.deletePurposeGroupLinks(List.of(bookmark.getId()));
        bookmarkRepository.delete(bookmark);
    }

    // 여러 개 영구 삭제
    @Transactional
    public void deleteAllPermanently(Long userId, BookmarkIdsRequest request) {
        Set<Long> ids = new HashSet<>(request.bookmarkIds());
        List<Bookmark> bookmarks = bookmarkRepository.findAllByIdInAndUserId(ids, userId);
        if (bookmarks.size() != ids.size()) {
            throw new CustomException(ErrorCode.BOOKMARK_NOT_FOUND);
        }
        if (bookmarks.stream().anyMatch(b -> !b.isDeleted())) {
            throw new CustomException(ErrorCode.NOT_IN_TRASH);
        }
        // TODO: 목적그룹_북마크 연결 삭제
        bookmarkRepository.deletePurposeGroupLinks(ids);
        bookmarkRepository.deleteAll(bookmarks);
    }

    // 열람 기록
    @Transactional
    public void recordView(Long userId, Long bookmarkId) {
        findActive(userId, bookmarkId).recordView();
    }

    // 분석 상태 조회
    public BookmarkStatusResponse getStatus(Long userId, Long bookmarkId) {
        return BookmarkStatusResponse.from(findActive(userId, bookmarkId));
    }

    // ===== 내부 메서드 =====

    private Bookmark findActive(Long userId, Long bookmarkId) {
        return bookmarkRepository.findByIdAndUserIdAndDeletedDateIsNull(bookmarkId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.BOOKMARK_NOT_FOUND));
    }

    private List<Bookmark> findActiveAll(Long userId, List<Long> bookmarkIds) {
        Set<Long> ids = new HashSet<>(bookmarkIds);
        List<Bookmark> bookmarks = bookmarkRepository.findAllByIdInAndUserIdAndDeletedDateIsNull(ids, userId);
        if (bookmarks.size() != ids.size()) {
            throw new CustomException(ErrorCode.BOOKMARK_NOT_FOUND);
        }
        return bookmarks;
    }

    private Category findCategory(Long userId, Long categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.CATEGORY_NOT_FOUND));
    }

    private Pageable pageable(int page, int size, String sort, String property) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        Sort.Direction direction = switch (sort.toLowerCase(Locale.ROOT)) {
            case "latest" -> Sort.Direction.DESC;
            case "oldest" -> Sort.Direction.ASC;
            default -> throw new CustomException(ErrorCode.INVALID_INPUT);
        };
        return PageRequest.of(page, size, Sort.by(direction, property).and(Sort.by(direction, "id")));
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

    private static String truncate(String v, int max) {
        return (v == null || v.length() <= max) ? v : v.substring(0, max);
    }
}