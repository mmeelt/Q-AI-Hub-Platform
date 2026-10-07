package tn.enicarthage.backend.exception;

/** The "current password" typed when changing the password is wrong (HTTP 400, not 401: the session is fine). */
public class WrongCurrentPasswordException extends RuntimeException {
    public WrongCurrentPasswordException(String message) {
        super(message);
    }
}
