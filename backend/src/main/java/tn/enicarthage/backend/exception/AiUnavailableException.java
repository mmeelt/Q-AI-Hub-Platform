package tn.enicarthage.backend.exception;

/** The AI service (Gemini) is not configured, timed out or returned an unusable answer. */
public class AiUnavailableException extends RuntimeException {
    public AiUnavailableException(String message) {
        super(message);
    }

    public AiUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
