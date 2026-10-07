package tn.enicarthage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginPendingResponse {
    private Boolean requiresOtp;
    private String otpSessionId;
    private String message;
    private Integer expiresIn;

    // Session opened without a code (never serialized: the controller turns it into cookies)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private AuthResponse session;
}
