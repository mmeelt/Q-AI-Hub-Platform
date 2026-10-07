package tn.enicarthage.backend.security;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtUtilTest {

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            f.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static JwtUtil newTestJwtUtil(JtiBlacklist blacklist) {
        JwtUtil jwtUtil = new JwtUtil(blacklist);

        // HS512 requires a sufficiently long key; this must be >= 64 bytes for jjwt Keys.hmacShaKeyFor
        String secret = "this_is_a_very_long_secret_key_for_hs512_should_be_long_enough_1234567890";
        setField(jwtUtil, "secret", secret);
        setField(jwtUtil, "expiration", 10_000L);
        setField(jwtUtil, "issuer", "platform-backend");
        return jwtUtil;
    }

    @Test
    void generateAndValidateTokenClaims_success() {
        tn.enicarthage.backend.repository.RevokedTokenRepository repo = mock(tn.enicarthage.backend.repository.RevokedTokenRepository.class);
        JtiBlacklist blacklist = new JtiBlacklist(repo);
        JwtUtil jwtUtil = newTestJwtUtil(blacklist);

        String token = jwtUtil.generateToken("user-1", "test@example.com", "USER");

        assertTrue(jwtUtil.validateToken(token));
        assertTrue(jwtUtil.validateTokenClaims(token));
        assertEquals("user-1", jwtUtil.extractUserId(token));
        assertNotNull(jwtUtil.extractJti(token));
        assertEquals("platform-backend", jwtUtil.extractIssuer(token));
    }

    @Test
    void validateTokenClaims_returnsFalse_whenJtiIsBlacklisted() {
        tn.enicarthage.backend.repository.RevokedTokenRepository repo = mock(tn.enicarthage.backend.repository.RevokedTokenRepository.class);
        JtiBlacklist blacklist = new JtiBlacklist(repo);
        JwtUtil jwtUtil = newTestJwtUtil(blacklist);

        String token = jwtUtil.generateToken("user-1", "test@example.com", "USER");
        String jti = jwtUtil.extractJti(token);

        when(repo.existsById(jti)).thenReturn(true);

        assertTrue(jwtUtil.validateToken(token));
        assertFalse(jwtUtil.validateTokenClaims(token));
    }

    @Test
    void validateTokenClaims_returnsFalse_whenIssuerMismatch() {
        tn.enicarthage.backend.repository.RevokedTokenRepository repo = mock(tn.enicarthage.backend.repository.RevokedTokenRepository.class);
        JtiBlacklist blacklist = new JtiBlacklist(repo);
        JwtUtil jwtUtil = newTestJwtUtil(blacklist);

        String token = jwtUtil.generateToken("user-1", "test@example.com", "USER");

        // Mutate issuer so the claims check should fail
        setField(jwtUtil, "issuer", "other-issuer");

        assertTrue(jwtUtil.validateToken(token));
        assertFalse(jwtUtil.validateTokenClaims(token));
    }

    @Test
    void validateTokenClaims_returnsFalse_whenExpired() {
        tn.enicarthage.backend.repository.RevokedTokenRepository repo = mock(tn.enicarthage.backend.repository.RevokedTokenRepository.class);
        JtiBlacklist blacklist = new JtiBlacklist(repo);
        JwtUtil jwtUtil = newTestJwtUtil(blacklist);
        setField(jwtUtil, "expiration", -1L); // force immediate expiration

        String token = jwtUtil.generateToken("user-1", "test@example.com", "USER");

        assertFalse(jwtUtil.validateToken(token));
        assertFalse(jwtUtil.validateTokenClaims(token));
    }
}

