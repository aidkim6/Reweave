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

    public void updateStatus(PurposeGroupStatus status) {
        if (status != null) {
            this.status = status;
        }
    }

    public void updateRecallHeadline(String recallHeadline) {
        this.recallHeadline = recallHeadline;
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
}