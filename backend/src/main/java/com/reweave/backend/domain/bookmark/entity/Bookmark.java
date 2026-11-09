package com.reweave.backend.domain.bookmark.entity;

import com.reweave.backend.domain.category.entity.Category;
import com.reweave.backend.domain.user.entity.User;
import com.reweave.backend.global.common.BaseTimeEntity;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "bookmarks",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_bookmarks_user_url_hash",
                columnNames = {"user_id", "url_hash"}
        )
)
public class Bookmark extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bookmark_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // null = 미분류
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "url", nullable = false, length = 2048)
    private String url;

    @Column(name = "url_hash", nullable = false, length = 64, columnDefinition = "CHAR(64)")
    private String urlHash;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "memo", length = 255)
    private String memo;

    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "thumbnail_url", length = 2048)
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 20)
    private ContentType contentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "save_source", nullable = false, length = 20)
    private SaveSource saveSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status", nullable = false, length = 20)
    private AnalysisStatus analysisStatus;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "last_viewed_date")
    private LocalDateTime lastViewedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "category_assigned_by", nullable = false, length = 20)
    private CategoryAssignedBy categoryAssignedBy;

    @Column(name = "deleted_date")
    private LocalDateTime deletedDate;

    protected Bookmark() {
    }

    public Bookmark(User user, Category category, String url, String urlHash, String title, String memo,
                    String content, String thumbnailUrl, ContentType contentType, SaveSource saveSource) {
        this.user = user;
        this.category = category;
        this.url = url;
        this.urlHash = urlHash;
        this.title = title;
        this.memo = memo;
        this.content = content;
        this.thumbnailUrl = thumbnailUrl;
        this.contentType = contentType;
        this.saveSource = saveSource;
        this.analysisStatus = AnalysisStatus.PENDING;
        this.viewCount = 0;
        // 카테고리를 안 골랐으면 AI가 분류할 대상
        this.categoryAssignedBy = (category == null) ? CategoryAssignedBy.AI : CategoryAssignedBy.USER;
    }

    public void updateTitle(String title) { this.title = title; }

    public void updateMemo(String memo) { this.memo = memo; }

    // 사용자가 카테고리를 바꾸면 지정주체 USER
    public void changeCategory(Category category) {
        this.category = category;
        this.categoryAssignedBy = CategoryAssignedBy.USER;
    }

    public void softDelete() { this.deletedDate = LocalDateTime.now(); }

    public boolean isDeleted() { return deletedDate != null; }

    public void recordView() {
        this.viewCount++;
        this.lastViewedDate = LocalDateTime.now();
    }

    // ===== AI 파트에서 호출 =====
    public void completeAnalysis(String summary, Category aiCategory) {
        this.summary = summary;
        if (this.categoryAssignedBy == CategoryAssignedBy.AI && aiCategory != null) {
            this.category = aiCategory;
        }
        this.analysisStatus = AnalysisStatus.COMPLETED;
    }

    public void failAnalysis() { this.analysisStatus = AnalysisStatus.FAILED; }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Category getCategory() { return category; }
    public String getUrl() { return url; }
    public String getUrlHash() { return urlHash; }
    public String getTitle() { return title; }
    public String getMemo() { return memo; }
    public String getContent() { return content; }
    public String getSummary() { return summary; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public ContentType getContentType() { return contentType; }
    public SaveSource getSaveSource() { return saveSource; }
    public AnalysisStatus getAnalysisStatus() { return analysisStatus; }
    public int getViewCount() { return viewCount; }
    public LocalDateTime getLastViewedDate() { return lastViewedDate; }
    public CategoryAssignedBy getCategoryAssignedBy() { return categoryAssignedBy; }
    public LocalDateTime getDeletedDate() { return deletedDate; }
}