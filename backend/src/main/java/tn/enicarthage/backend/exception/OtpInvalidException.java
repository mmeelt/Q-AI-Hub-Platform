package tn.enicarthage.backend.exception;

public class OtpInvalidException extends RuntimeException {
    private final int attemptsRemaining;
    public OtpInvalidException(String message, int attemptsRemaining) {
        super(message);
        this.attemptsRemaining = attemptsRemaining;
    }
    public int getAttemptsRemaining() { return attemptsRemaining; }
}
