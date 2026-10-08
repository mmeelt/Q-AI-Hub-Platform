package tn.enicarthage.backend.security;

import tn.enicarthage.backend.CompetitionPlatformApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = CompetitionPlatformApplication.class)
@ActiveProfiles("test")
@TestPropertySource(properties = {"jwt.secret=this_is_a_very_long_secret_key_for_hs512_should_be_long_enough_1234567890"})
class SecurityIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private JwtUtil jwtUtil;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    void whenUnauthenticated_requestsReturn401() throws Exception {
        mockMvc.perform(get("/api/users/profile"))
                .andExpect(status().isUnauthorized()); // no session -> 401 so the client refreshes or logs in
    }

    @Test
    void apiDocs_areOffUnlessEnabled() throws Exception {
        // springdoc is only turned on by the dev profile (or API_DOCS_ENABLED=true)
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isNotFound());
    }

    @Test
    void whenAuthenticatedUser_accessesAdminEndpoint_returns403() throws Exception {
        String userToken = jwtUtil.generateToken("test-user-id", "test@example.com", "USER");
        
        mockMvc.perform(get("/api/admin/startups")
                .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden()); // User does not have ADMIN role
    }

    @Autowired
    private tn.enicarthage.backend.repository.AdminRepository adminRepository;

    @Test
    void removedAdmin_tokenNoLongerGrantsAccess() throws Exception {
        // the admin account does not exist (anymore): its still-valid token must not work
        String adminToken = jwtUtil.generateToken("deleted-admin", "gone@example.com", "ADMIN");
        mockMvc.perform(get("/api/admin/startups")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void whenAuthenticatedAdmin_accessesAdminEndpoint_returns200or404() throws Exception {
        // We use ROLE_ADMIN or ADMIN, depending on JwtFilter padding "ROLE_".
        // The Service assigns "ADMIN", JwtFilter maps it to GrantedAuthority("ROLE_ADMIN").
        adminRepository.save(tn.enicarthage.backend.entity.Admin.builder()
                .adminId("admin-id").adminEmail("admin@example.com").passwordHash("x").build());
        String adminToken = jwtUtil.generateToken("admin-id", "admin@example.com", "ADMIN");
        
        mockMvc.perform(get("/api/admin/startups")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // If it passes Security it should hit the controller (200 or 404/400 depends on DB state).
                    // As long as it is not 401/403, Security allowed it.
                    assert(status != 401 && status != 403);
                });
    }
}
