package tn.enicarthage.backend.security;

import tn.enicarthage.backend.exception.InvalidEmailException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InputSanitizerTest {

    @Test
    void sanitizeRemovesHtmlAndScripts() {
        InputSanitizer sanitizer = new InputSanitizer();

        String input = "<b>Hi</b> javascript:alert(1) \u0000";
        String sanitized = sanitizer.sanitize(input);

        assertFalse(sanitized.contains("<b>"));
        assertFalse(sanitized.toLowerCase().contains("javascript:"));
        assertFalse(sanitized.contains("\u0000"));
    }

    @Test
    void sanitizeEmailNormalizesAndValidates() {
        InputSanitizer sanitizer = new InputSanitizer();

        assertEquals("test@example.com", sanitizer.sanitizeEmail("  Test@Example.com "));
    }

    @Test
    void sanitizeEmailRejectsInvalidEmail() {
        InputSanitizer sanitizer = new InputSanitizer();

        assertThrows(InvalidEmailException.class, () -> sanitizer.sanitizeEmail("not-an-email"));
    }
}

