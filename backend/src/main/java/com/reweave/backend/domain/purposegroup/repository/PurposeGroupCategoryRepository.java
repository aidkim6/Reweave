package com.reweave.backend.domain.purposegroup.repository;

import com.reweave.backend.domain.purposegroup.entity.PurposeGroupCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PurposeGroupCategoryRepository extends JpaRepository<PurposeGroupCategory, Long> {

    // 프로젝트 카드 태그용: 프로젝트별 참조 카테고리 (연결을 만든 순서대로)
    interface CategoryTagRow {
        Long getPurposeGroupId();

        Long getCategoryId();

        String getCategoryName();
    }

    @Query("select pgc.purposeGroupId as purposeGroupId, c.id as categoryId, c.categoryName as categoryName " +
            "from PurposeGroupCategory pgc join Category c on c.id = pgc.categoryId " +
            "where pgc.purposeGroupId in :purposeGroupIds " +
            "order by pgc.id asc")
    List<CategoryTagRow> findTagsByPurposeGroupIds(@Param("purposeGroupIds") Collection<Long> purposeGroupIds);

    // 프로젝트의 참조 카테고리 연결 전체 삭제 (바로 실행되므로 이어서 같은 카테고리를 다시 저장해도 충돌하지 않음)
    @Modifying(flushAutomatically = true)
    @Query("delete from PurposeGroupCategory pgc where pgc.purposeGroupId = :purposeGroupId")
    int deleteByPurposeGroupId(@Param("purposeGroupId") Long purposeGroupId);
}