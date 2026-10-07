package tn.enicarthage.backend.exception;

public class OtpMaxAttemptsException extends RuntimeException {
    public OtpMaxAttemptsException(String message) { super(message); }
}
