package tn.enicarthage.backend.exception;

public class TokenRevokedException extends RuntimeException {
    public TokenRevokedException(String message) { super(message); }
}
