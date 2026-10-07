package tn.enicarthage.backend.security;

import tn.enicarthage.backend.exception.PasswordWeakException;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class PasswordValidator {

    private static final List<String> COMMON_PASSWORDS = Arrays.asList(
        "123456", "password", "12345678", "qwerty", "abc123", 
        "monkey", "1234567", "letmein", "trustno1", "dragon",
        "baseball", "iloveyou", "master", "sunshine", "ashley",
        "bailey", "passw0rd", "shadow", "123123", "654321",
        "superman", "qazwsx", "michael", "football"
    );

    public void validate(String password) {
        if (password == null) throw new PasswordWeakException("Password cannot be null");
        if (password.length() < 8) throw new PasswordWeakException("Password must be at least 8 characters");
        if (password.length() > 128) throw new PasswordWeakException("Password must be at most 128 characters");
        if (password.matches(".*\\s.*")) throw new PasswordWeakException("Password cannot contain whitespace");
        if (!password.matches(".*[A-Z].*")) throw new PasswordWeakException("Password must contain at least 1 uppercase letter");
        if (!password.matches(".*[a-z].*")) throw new PasswordWeakException("Password must contain at least 1 lowercase letter");
        if (!password.matches(".*[0-9].*")) throw new PasswordWeakException("Password must contain at least 1 digit");
        // Any symbol (not a letter or digit). The previous list contained "+-=", a character RANGE
        // that also matched the digits 0-9, so "Abcdefg1" was wrongly accepted.
        if (!password.matches(".*[^A-Za-z0-9].*")) {
            throw new PasswordWeakException("Password must contain at least 1 special character");
        }
        if (password.toLowerCase().contains("password")) {
            throw new PasswordWeakException("Password cannot contain the word 'password'");
        }
        if (COMMON_PASSWORDS.contains(password.toLowerCase())) {
            throw new PasswordWeakException("Password is too common");
        }
    }
}
