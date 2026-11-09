package com.reweave.backend.domain.purposegroup.entity;

import com.reweave.backend.domain.bookmark.entity.Bookmark;
import com.reweave.backend.global.common.BaseTimeEntity;
import jakarta.persistence.*;

@Entity
@Table(
        name = "purposegroup_bookmarks",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_purposegroup_bookmark",
                columnNames = {"purpose_group_id", "bookmark_id"}
        )
)
public class PurposeGroupBookmark extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "purpose_group_bookmark_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purpose_group_id", nullable = false)
    private PurposeGroup purposeGroup;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bookmark_id", nullable = false)
    private Bookmark bookmark;

    protected PurposeGroupBookmark() {
    }

    public PurposeGroupBookmark(PurposeGroup purposeGroup, Bookmark bookmark) {
        this.purposeGroup = purposeGroup;
        this.bookmark = bookmark;
    }

    public Long getId() {
        return id;
    }

    public PurposeGroup getPurposeGroup() {
        return purposeGroup;
    }

    public Bookmark getBookmark() {
        return bookmark;
    }
}