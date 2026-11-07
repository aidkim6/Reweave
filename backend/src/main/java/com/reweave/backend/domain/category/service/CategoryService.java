package com.reweave.backend.domain.category.service;

import com.reweave.backend.domain.bookmark.repository.BookmarkRepository;
import com.reweave.backend.domain.category.dto.*;
import com.reweave.backend.domain.category.entity.Category;
import com.reweave.backend.domain.category.repository.CategoryRepository;
import com.reweave.backend.domain.user.repository.UserRepository;
import com.reweave.backend.global.exception.CustomException;
import com.reweave.backend.global.exception.ErrorCode;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private static final Pageable THUMBNAIL_LIMIT = PageRequest.of(0, 4);

    private final CategoryRepository categoryRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;

    public CategoryService(CategoryRepository categoryRepository,
                           BookmarkRepository bookmarkRepository,
                           UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.userRepository = userRepository;
    }

    // 카테고리 생성: 목록 맨 앞(sort_order 0)에 추가
    @Transactional
    public CategoryIdResponse create(Long userId, CategoryCreateRequest request) {
        String name = request.categoryName().trim();
        if (categoryRepository.existsByUserIdAndCategoryName(userId, name)) {
            throw new CustomException(ErrorCode.DUPLICATE_CATEGORY_NAME);
        }

        categoryRepository.shiftSortOrders(userId);
        Category category = new Category(
                userRepository.getReferenceById(userId),
                name,
                blankToNull(request.description()),
                0
        );

        try {
            categoryRepository.saveAndFlush(category);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.DUPLICATE_CATEGORY_NAME); // 동시에 같은 이름 생성한 경우
        }
        return new CategoryIdResponse(category.getId());
    }

    // 내 카테고리 목록: 정렬 순서 + 북마크 개수 + 썸네일 최대 4개
    public CategoryListResponse findAll(Long userId) {
        Map<Long, Long> counts = bookmarkRepository.countActiveByCategory(userId).stream()
                .collect(Collectors.toMap(
                        BookmarkRepository.CategoryCount::getCategoryId,
                        BookmarkRepository.CategoryCount::getCount
                ));

        List<CategoryResponse> categories = categoryRepository.findAllByUserIdOrderBySortOrderAscIdAsc(userId)
                .stream()
                .map(category -> {
                    long count = counts.getOrDefault(category.getId(), 0L);
                    List<String> thumbnails = count == 0
                            ? List.of()
                            : bookmarkRepository.findThumbnailsByCategory(userId, category.getId(), THUMBNAIL_LIMIT);
                    return CategoryResponse.of(category, count, thumbnails);
                })
                .toList();

        return new CategoryListResponse(categories);
    }

    // 기본 카테고리: 전체 / 미분류 / 최근 삭제된 링크
    public DefaultCategoryResponse findDefault(Long userId) {
        CategoryCountResponse all = new CategoryCountResponse(
                bookmarkRepository.countByUserIdAndDeletedDateIsNull(userId),
                bookmarkRepository.findThumbnailsAll(userId, THUMBNAIL_LIMIT)
        );
        CategoryCountResponse uncategorized = new CategoryCountResponse(
                bookmarkRepository.countByUserIdAndCategoryIsNullAndDeletedDateIsNull(userId),
                bookmarkRepository.findThumbnailsUncategorized(userId, THUMBNAIL_LIMIT)
        );
        CategoryCountResponse trash = new CategoryCountResponse(
                bookmarkRepository.countByUserIdAndDeletedDateIsNotNull(userId),
                bookmarkRepository.findThumbnailsInTrash(userId, THUMBNAIL_LIMIT)
        );
        return new DefaultCategoryResponse(all, uncategorized, trash);
    }

    // 카테고리 수정 (보낸 필드만)
    @Transactional
    public CategoryIdResponse update(Long userId, Long categoryId, CategoryUpdateRequest request) {
        Category category = findCategory(userId, categoryId);

        if (request.categoryName() != null) {
            String name = request.categoryName().trim();
            if (name.isEmpty()) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            if (categoryRepository.existsByUserIdAndCategoryNameAndIdNot(userId, name, categoryId)) {
                throw new CustomException(ErrorCode.DUPLICATE_CATEGORY_NAME);
            }
            category.updateName(name);
        }
        if (request.description() != null) {
            category.updateDescription(blankToNull(request.description())); // "" 보내면 설명 삭제
        }
        return new CategoryIdResponse(category.getId());
    }

    // 카테고리 삭제: 안의 북마크와 목적그룹 연결은 미분류(NULL)로
    @Transactional
    public void delete(Long userId, Long categoryId) {
        Category category = findCategory(userId, categoryId);

        bookmarkRepository.clearCategory(userId, categoryId);
        categoryRepository.clearPurposeGroupCategory(userId, categoryId);
        categoryRepository.deletePurposeGroupCategoryLinks(categoryId);
        categoryRepository.delete(category);
    }

    // 순서 변경: 내 카테고리 전체를 빠짐없이, 중복 없이 받아야 함
    @Transactional
    public void changeOrder(Long userId, CategoryOrderRequest request) {
        List<Long> ids = request.categoryIds();
        List<Category> myCategories = categoryRepository.findAllByUserIdOrderBySortOrderAscIdAsc(userId);

        Set<Long> requestIds = new HashSet<>(ids);
        Set<Long> myIds = myCategories.stream().map(Category::getId).collect(Collectors.toSet());

        if (requestIds.size() != ids.size() || !requestIds.equals(myIds)) {
            throw new CustomException(ErrorCode.INVALID_CATEGORY_ORDER);
        }

        Map<Long, Category> byId = myCategories.stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));
        for (int i = 0; i < ids.size(); i++) {
            byId.get(ids.get(i)).changeSortOrder(i);
        }
    }

    private Category findCategory(Long userId, Long categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.CATEGORY_NOT_FOUND));
    }

    private static String blankToNull(String v) {
        return (v == null || v.isBlank()) ? null : v.trim();
    }
}