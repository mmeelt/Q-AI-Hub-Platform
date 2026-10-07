package tn.enicarthage.backend.exception;

public class PasswordWeakException extends RuntimeException {
    public PasswordWeakException(String message) {
        super(message);
    }
}
