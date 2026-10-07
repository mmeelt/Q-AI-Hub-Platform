package tn.enicarthage.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VerifyOtpRequest {
    @NotBlank
    private String otpSessionId;
    
    @NotBlank
    @Size(min=6, max=6)
    private String otpCode;

    // "Remember me": keep the session after the browser is closed (default: no)
    private Boolean rememberMe;
}
