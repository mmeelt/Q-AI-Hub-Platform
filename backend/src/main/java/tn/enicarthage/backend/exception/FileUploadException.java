package tn.enicarthage.backend.exception;

/** A rejected upload (wrong type, too large...). The message is shown to the user as-is (HTTP 400). */
public class FileUploadException extends RuntimeException {
    public FileUploadException(String message) {
        super(message);
    }
}
