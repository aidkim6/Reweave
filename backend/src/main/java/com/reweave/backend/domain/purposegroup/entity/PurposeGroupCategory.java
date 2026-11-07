package com.reweave.backend.domain.purposegroup.entity;

import com.reweave.backend.global.common.BaseTimeEntity;
import jakarta.persistence.*;

// 프로젝트(목적 그룹)가 참조하는 카테고리 연결 (프로젝트 1 : 카테고리 N)
@Entity
@Table(
        name = "purposegroup_categories",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_purposegroup_category",
                columnNames = {"purpose_group_id", "category_id"}
        )
)
public class PurposeGroupCategory extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "purpose_group_category_id")
    private Long id;

    @Column(name = "purpose_group_id", nullable = false)
    private Long purposeGroupId;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    protected PurposeGroupCategory() {
    }

    public PurposeGroupCategory(Long purposeGroupId, Long categoryId) {
        this.purposeGroupId = purposeGroupId;
        this.categoryId = categoryId;
    }

    public Long getId() {
        return id;
    }

    public Long getPurposeGroupId() {
        return purposeGroupId;
    }

    public Long getCategoryId() {
        return categoryId;
    }
}