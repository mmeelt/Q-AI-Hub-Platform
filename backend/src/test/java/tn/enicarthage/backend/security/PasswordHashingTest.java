package tn.enicarthage.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import tn.enicarthage.backend.config.SecurityConfig;

import static org.junit.jupiter.api.Assertions.*;

class PasswordHashingTest {

    // The encoder the application really uses (SecurityConfig#passwordEncoder)
    private final PasswordEncoder encoder = new SecurityConfig(null, null, null).passwordEncoder();

    @Test
    void hash_isBCryptWithCost12_andNeverThePlainPassword() {
        String hash = encoder.encode("Str0ng!Pass");

        assertTrue(hash.startsWith("$2a$12$"), hash);
        assertFalse(hash.contains("Str0ng!Pass"));
    }

    @Test
    void samePassword_givesADifferentHashEachTime_butBothMatch() {
        String first = encoder.encode("Str0ng!Pass");
        String second = encoder.encode("Str0ng!Pass");

        assertNotEquals(first, second); // random salt
        assertTrue(encoder.matches("Str0ng!Pass", first));
        assertTrue(encoder.matches("Str0ng!Pass", second));
    }

    @Test
    void wrongPassword_doesNotMatch() {
        assertFalse(encoder.matches("wrong-password", encoder.encode("Str0ng!Pass")));
    }
}
