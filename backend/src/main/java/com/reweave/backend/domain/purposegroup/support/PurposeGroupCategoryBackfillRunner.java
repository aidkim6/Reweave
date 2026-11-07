package com.reweave.backend.domain.purposegroup.support;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 참조 카테고리 연결 테이블(purposegroup_categories) 도입 전에 만들어진 프로젝트 이전용.
 *
 * category_id는 있지만 연결 행이 하나도 없는 프로젝트에만 연결 행을 만들어 준다.
 * - 이미 연결 행이 있는 프로젝트는 건드리지 않는다.
 * - 이미 이전된 뒤에는 추가되는 행이 없으므로 서버를 여러 번 켜도 안전하다.
 * - 모든 환경(로컬, 서버)에서 이전이 끝나면 이 클래스는 삭제해도 된다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PurposeGroupCategoryBackfillRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            int inserted = jdbcTemplate.update("""
                    INSERT INTO purposegroup_categories (purpose_group_id, category_id, created_date, modified_date)
                    SELECT p.purpose_group_id, p.category_id, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
                    FROM purposegroups p
                    WHERE p.category_id IS NOT NULL
                      AND EXISTS (
                          SELECT 1 FROM categories c WHERE c.category_id = p.category_id
                      )
                      AND NOT EXISTS (
                          SELECT 1 FROM purposegroup_categories x WHERE x.purpose_group_id = p.purpose_group_id
                      )
                    """);
            if (inserted > 0) {
                log.info("기존 프로젝트 {}개의 참조 카테고리를 연결 테이블로 이전했습니다.", inserted);
            }
        } catch (Exception e) {
            // 이전 실패가 서버 시작을 막지 않도록 로그만 남김
            log.warn("참조 카테고리 이전 실패 (서버는 계속 실행됩니다): {}", e.getMessage());
        }
    }
}