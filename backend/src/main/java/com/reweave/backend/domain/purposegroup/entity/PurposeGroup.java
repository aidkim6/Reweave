package com.reweave.backend.domain.purposegroup.entity;

import com.reweave.backend.global.common.BaseTimeEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "purposegroups")
public class PurposeGroup extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "purpose_group_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 참조 카테고리 중 첫 번째 (기존 프론트/리콜 호환용). 전체 참조 카테고리는 purposegroup_categories에 저장
    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "purpose_name", nullable = false, length = 255)
    private String purposeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PurposeGroupStatus status;

    // AI가 미리 생성해 둔 홈 화면 리콜 카드용 추천문구 (없으면 null)
    @Column(name = "recall_headline", length = 100)
    private String recallHeadline;

    // 프로젝트 목록 정렬 순서 (작을수록 앞, 새 그룹은 0으로 맨 앞에 추가)
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected PurposeGroup() {
    }

    public PurposeGroup(Long userId, String purposeName, PurposeGroupStatus status, Long categoryId) {
        this.userId = userId;
        this.purposeName = purposeName;
        this.status = status;
        this.categoryId = categoryId;
    }

    public void update(String purposeName, Long categoryId) {
        if (purposeName != null && !purposeName.isBlank()) {
            this.purposeName = purposeName;
        }
        if (categoryId != null) {
            this.categoryId = categoryId;
        }
    }

    // null도 허용 (참조 카테고리를 모두 해제하는 경우)
    public void updateCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public void updateStatus(PurposeGroupStatus status) {
        if (status != null) {
            this.status = status;
        }
    }

    public void updateRecallHeadline(String recallHeadline) {
        this.recallHeadline = recallHeadline;
    }

    public void changeSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public String getPurposeName() {
        return purposeName;
    }

    public PurposeGroupStatus getStatus() {
        return status;
    }

    public String getRecallHeadline() {
        return recallHeadline;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}