package tn.enicarthage.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentials(InvalidCredentialsException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(PasswordWeakException.class)
    public ResponseEntity<Map<String, Object>> handlePasswordWeak(PasswordWeakException ex) {
        log.warn("Password rejected: {}", ex.getMessage());
        return buildResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<Map<String, Object>> handleEmailExistsLog(EmailAlreadyExistsException ex) {
        log.warn("Register rejected (duplicate email): {}", ex.getMessage());
        return buildResponse(ex.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<Map<String, Object>> handleAccountLocked(AccountLockedException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.LOCKED);
    }

    @ExceptionHandler(InvalidEmailException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidEmail(InvalidEmailException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(InvalidInvitationException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidInvitation(InvalidInvitationException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler({TokenNotFoundException.class, TokenRevokedException.class, TokenExpiredException.class})
    public ResponseEntity<Map<String, Object>> handleTokenExceptions(RuntimeException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.UNAUTHORIZED);
    }

    // OTP Exceptions
    @ExceptionHandler(OtpNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleOtpNotFound(OtpNotFoundException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(OtpExpiredException.class)
    public ResponseEntity<Map<String, Object>> handleOtpExpired(OtpExpiredException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.GONE);
    }

    @ExceptionHandler(OtpInvalidException.class)
    public ResponseEntity<Map<String, Object>> handleOtpInvalid(OtpInvalidException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", ex.getMessage());
        body.put("attemptsRemaining", ex.getAttemptsRemaining());
        body.put("status", HttpStatus.UNAUTHORIZED.value());
        // Use String to avoid requiring jackson-datatype-jsr310 everywhere.
        body.put("timestamp", LocalDateTime.now().toString());
        return new ResponseEntity<>(body, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(OtpAlreadyUsedException.class)
    public ResponseEntity<Map<String, Object>> handleOtpAlreadyUsed(OtpAlreadyUsedException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(OtpMaxAttemptsException.class)
    public ResponseEntity<Map<String, Object>> handleOtpMaxAttempts(OtpMaxAttemptsException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.TOO_MANY_REQUESTS);
    }

    @ExceptionHandler(WrongCurrentPasswordException.class)
    public ResponseEntity<Map<String, Object>> handleWrongCurrentPassword(WrongCurrentPasswordException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(FileUploadException.class)
    public ResponseEntity<Map<String, Object>> handleFileUpload(FileUploadException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleTooLarge(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        return buildResponse("The file is too large (max 200 MB for videos, 10 MB for images and PDF)", HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @ExceptionHandler(MailDeliveryException.class)
    public ResponseEntity<Map<String, Object>> handleMailDelivery(MailDeliveryException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.BAD_GATEWAY);
    }

    @ExceptionHandler(jakarta.persistence.EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(jakarta.persistence.EntityNotFoundException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        // the message is shown to the user as is ("Please answer the required question: ...")
        return buildResponse(ex.getMessage() != null ? ex.getMessage() : "Invalid input", HttpStatus.BAD_REQUEST);
    }

    // e.g. /api/submissions/abc/grade where a number is expected: a bad request, not a server error
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        return buildResponse("Invalid value for '" + ex.getName() + "'", HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return buildResponse(ex.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return buildResponse(errors, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ExpiredJwtException.class)
    public ResponseEntity<Map<String, Object>> handleExpiredJwt(ExpiredJwtException ex) {
        return buildResponse("Session expired. Please log in again.", HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<Map<String, Object>> handleJwtException(JwtException ex) {
        return buildResponse("Invalid authentication token.", HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        // Spring's own client errors (unknown URL, wrong method, unreadable JSON, missing parameter...)
        // carry their status: keep it instead of reporting a server error.
        if (ex instanceof org.springframework.web.ErrorResponse er && er.getStatusCode().is4xxClientError()) {
            HttpStatus status = HttpStatus.valueOf(er.getStatusCode().value());
            return buildResponse(status == HttpStatus.NOT_FOUND ? "Not found" : status.getReasonPhrase(), status);
        }
        if (ex instanceof org.springframework.http.converter.HttpMessageNotReadableException) {
            return buildResponse("The request body is missing or malformed", HttpStatus.BAD_REQUEST);
        }
        log.error("Unhandled exception", ex);
        return buildResponse("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private ResponseEntity<Map<String, Object>> buildResponse(String message, HttpStatus status) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", message);
        body.put("status", status.value());
        // Use String to avoid requiring jackson-datatype-jsr310 everywhere.
        body.put("timestamp", LocalDateTime.now().toString());
        return new ResponseEntity<>(body, status);
    }
}
