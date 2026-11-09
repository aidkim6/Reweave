package com.reweave.backend.domain.category.entity;

import com.reweave.backend.domain.user.entity.User;
import com.reweave.backend.global.common.BaseTimeEntity;
import jakarta.persistence.*;

@Entity
@Table(
        name = "categories",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_categories_user_name",
                columnNames = {"user_id", "category_name"}
        )
)
public class Category extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "category_name", nullable = false, length = 255)
    private String categoryName;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected Category() {
    }

    public Category(User user, String categoryName, String description, int sortOrder) {
        this.user = user;
        this.categoryName = categoryName;
        this.description = description;
        this.sortOrder = sortOrder;
    }

    public void updateName(String categoryName) { this.categoryName = categoryName; }

    public void updateDescription(String description) { this.description = description; }

    public void changeSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getCategoryName() { return categoryName; }
    public String getDescription() { return description; }
    public int getSortOrder() { return sortOrder; }
}