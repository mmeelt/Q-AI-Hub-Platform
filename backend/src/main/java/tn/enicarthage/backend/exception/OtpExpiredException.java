package tn.enicarthage.backend.exception;

public class OtpExpiredException extends RuntimeException {
    public OtpExpiredException(String message) { super(message); }
}
