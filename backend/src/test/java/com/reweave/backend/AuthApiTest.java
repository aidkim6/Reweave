package com.reweave.backend;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 유저 인증 API 통합 테스트
 * 실제 서버를 띄우지 않고, 가짜 요청(MockMvc)을 보내서 응답을 확인해요.
 * @Transactional: 테스트 하나가 끝날 때마다 DB 변경을 되돌려서, 테스트끼리 서로 영향을 주지 않아요.
 */
@SpringBootTest
@Transactional
class AuthApiTest {

    private static final String EMAIL = "test@naver.com";
    private static final String PASSWORD = "abcd1234";

    @Autowired
    private WebApplicationContext context;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        // Security 필터(JWT 검사)까지 포함해서 요청을 보내도록 설정
        Filter securityFilter = context.getBean("springSecurityFilterChain", Filter.class);
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(securityFilter).build();
    }

    // ===== 회원가입 =====

    @Test
    @DisplayName("회원가입 성공 → 201, userId 반환")
    void signup_success() throws Exception {
        signup(EMAIL, PASSWORD)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").isNumber());
    }

    @Test
    @DisplayName("같은 이메일로 가입 → 409 DUPLICATE_EMAIL")
    void signup_duplicateEmail() throws Exception {
        signup(EMAIL, PASSWORD);

        signup(EMAIL, PASSWORD)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_EMAIL"));
    }

    @Test
    @DisplayName("비밀번호에 숫자 없음 → 400 INVALID_INPUT")
    void signup_invalidPassword() throws Exception {
        signup(EMAIL, "abcdefgh")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    // ===== 로그인 =====

    @Test
    @DisplayName("로그인 성공 → Access·Refresh Token 발급")
    void login_success() throws Exception {
        signup(EMAIL, PASSWORD);

        login(EMAIL, PASSWORD, "WEB")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.data.accessTokenExpiresIn").value(1800));
    }

    @Test
    @DisplayName("없는 이메일로 로그인 → 404 USER_NOT_FOUND")
    void login_userNotFound() throws Exception {
        login("nobody@naver.com", PASSWORD, "WEB")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    @DisplayName("비밀번호 틀림 → 401 INVALID_PASSWORD")
    void login_wrongPassword() throws Exception {
        signup(EMAIL, PASSWORD);

        login(EMAIL, "wrong1234", "WEB")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_PASSWORD"));
    }

    @Test
    @DisplayName("대문자로 가입해도 소문자로 로그인 가능")
    void login_emailCaseInsensitive() throws Exception {
        signup("Test@Naver.com", PASSWORD);

        login("test@naver.com", PASSWORD, "WEB")
                .andExpect(status().isOk());
    }

    // ===== 내 정보 =====

    @Test
    @DisplayName("토큰 있으면 내 정보 조회 성공")
    void me_success() throws Exception {
        signup(EMAIL, PASSWORD);
        String accessToken = read(login(EMAIL, PASSWORD, "WEB"), "$.data.accessToken");

        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(EMAIL))
                .andExpect(jsonPath("$.data.nickname").value("tester"));
    }

    @Test
    @DisplayName("토큰 없으면 → 401 UNAUTHORIZED")
    void me_withoutToken() throws Exception {
        mvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    // ===== 재발급·로그아웃 =====

    @Test
    @DisplayName("재발급 성공, 이미 쓴 옛 Refresh Token은 → 401 INVALID_REFRESH_TOKEN")
    void reissue_rotation() throws Exception {
        signup(EMAIL, PASSWORD);
        String oldRefresh = read(login(EMAIL, PASSWORD, "WEB"), "$.data.refreshToken");

        reissue(oldRefresh, "WEB")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());

        reissue(oldRefresh, "WEB")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    @DisplayName("웹만 로그아웃 → 웹 재발급은 401, 확장 재발급은 그대로 성공")
    void logout_onlyThatClient() throws Exception {
        signup(EMAIL, PASSWORD);
        ResultActions web = login(EMAIL, PASSWORD, "WEB");
        String webAccess = read(web, "$.data.accessToken");
        String webRefresh = read(web, "$.data.refreshToken");
        String extRefresh = read(login(EMAIL, PASSWORD, "EXTENSION"), "$.data.refreshToken");

        mvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + webAccess)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clientType\":\"WEB\"}"))
                .andExpect(status().isOk());

        reissue(webRefresh, "WEB").andExpect(status().isUnauthorized());
        reissue(extRefresh, "EXTENSION").andExpect(status().isOk());
    }

    // ===== 요청 보내는 도우미 메서드 =====

    private ResultActions signup(String email, String password) throws Exception {
        String body = "{\"email\":\"%s\",\"password\":\"%s\",\"nickname\":\"tester\"}".formatted(email, password);
        return mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions login(String email, String password, String clientType) throws Exception {
        String body = "{\"email\":\"%s\",\"password\":\"%s\",\"clientType\":\"%s\"}".formatted(email, password, clientType);
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions reissue(String refreshToken, String clientType) throws Exception {
        String body = "{\"refreshToken\":\"%s\",\"clientType\":\"%s\"}".formatted(refreshToken, clientType);
        return mvc.perform(post("/api/auth/reissue").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    // 응답 JSON에서 값 하나 꺼내기 (예: "$.data.accessToken")
    private String read(ResultActions result, String path) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), path);
    }
}