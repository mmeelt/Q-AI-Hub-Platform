package tn.enicarthage.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_GATEWAY)
public class MailDeliveryException extends RuntimeException {
    public MailDeliveryException(String message) {
        super(message);
    }
}
