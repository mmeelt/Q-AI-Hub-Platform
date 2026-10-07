package tn.enicarthage.backend.security;

import tn.enicarthage.backend.exception.InvalidEmailException;
import org.springframework.stereotype.Component;
import java.util.regex.Pattern;

@Component
public class InputSanitizer {

    private static final Pattern EMAIL_PATTERN = 
        Pattern.compile("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");

    public String sanitize(String input) {
        if (input == null) return null;
        String sanitized = input.replaceAll("<[^>]*>", "");
        sanitized = sanitized.replaceAll("(?i)javascript:", "");
        sanitized = sanitized.replaceAll("(?i)vbscript:", "");
        sanitized = sanitized.replaceAll("\0", "");
        return sanitized.trim();
    }

    public String sanitizeEmail(String email) {
        if (email == null) return null;
        String cleanEmail = email.toLowerCase().trim();
        if (!EMAIL_PATTERN.matcher(cleanEmail).matches()) {
            throw new InvalidEmailException("Invalid email format");
        }
        return cleanEmail;
    }
}
