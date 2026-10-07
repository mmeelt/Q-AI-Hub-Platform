package tn.enicarthage.backend.security;

import tn.enicarthage.backend.exception.PasswordWeakException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordValidatorTest {

    @Test
    void validate_throwsOnNull() {
        PasswordValidator validator = new PasswordValidator();
        assertThrows(PasswordWeakException.class, () -> validator.validate(null));
    }

    @Test
    void validate_throwsOnTooShort() {
        PasswordValidator validator = new PasswordValidator();
        assertThrows(PasswordWeakException.class, () -> validator.validate("Aa1!aaa")); // length 7 (< 8)
    }

    @Test
    void validate_acceptsStrongPassword() {
        PasswordValidator validator = new PasswordValidator();

        // >= 8 chars, includes upper/lower/digit/special, and does not include common password words
        assertDoesNotThrow(() -> validator.validate("MySecurePass1!"));
    }

    @org.junit.jupiter.api.Test
    void digitIsNotASpecialCharacter() {
        // regression: the old rule's "+-=" range made any digit count as a symbol
        org.junit.jupiter.api.Assertions.assertThrows(tn.enicarthage.backend.exception.PasswordWeakException.class,
                () -> new PasswordValidator().validate("Abcdefg1"));
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() -> new PasswordValidator().validate("Abcdefg1!"));
    }
}
