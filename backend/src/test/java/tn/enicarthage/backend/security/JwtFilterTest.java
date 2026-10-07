package tn.enicarthage.backend.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtFilterTest {

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            f.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static JwtUtil newTestJwtUtil(JtiBlacklist blacklist) {
        JwtUtil jwtUtil = new JwtUtil(blacklist);

        String secret = "this_is_a_very_long_secret_key_for_hs512_should_be_long_enough_1234567890";
        setField(jwtUtil, "secret", secret);
        setField(jwtUtil, "expiration", 10_000L);
        setField(jwtUtil, "issuer", "platform-backend");
        return jwtUtil;
    }

    @Test
    void whenBearerTokenValid_setsSecurityContext() throws Exception {
        tn.enicarthage.backend.repository.RevokedTokenRepository repo = mock(tn.enicarthage.backend.repository.RevokedTokenRepository.class);
        JtiBlacklist blacklist = new JtiBlacklist(repo);
        JwtUtil jwtUtil = newTestJwtUtil(blacklist);

        JwtFilter filter = new JwtFilter(jwtUtil);

        String userId = "user-1";
        String token = jwtUtil.generateToken(userId, "test@example.com", "USER");

        SecurityContextHolder.clearContext();
        assertNull(SecurityContextHolder.getContext().getAuthentication());

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/users/profile");
        request.addHeader("Authorization", "Bearer " + token);

        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals(userId, auth.getName());
        assertTrue(auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> "ROLE_USER".equals(a)));
        verify(chain, times(1)).doFilter(request, response);
    }

    @Test
    void whenBearerTokenInvalid_doesNotSetAuthentication() throws Exception {
        tn.enicarthage.backend.repository.RevokedTokenRepository repo = mock(tn.enicarthage.backend.repository.RevokedTokenRepository.class);
        JtiBlacklist blacklist = new JtiBlacklist(repo);
        JwtUtil jwtUtil = newTestJwtUtil(blacklist);

        JwtFilter filter = new JwtFilter(jwtUtil);

        SecurityContextHolder.clearContext();
        assertNull(SecurityContextHolder.getContext().getAuthentication());

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/users/profile");
        request.addHeader("Authorization", "Bearer not-a-valid-token");

        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain, times(1)).doFilter(request, response);
    }
}

