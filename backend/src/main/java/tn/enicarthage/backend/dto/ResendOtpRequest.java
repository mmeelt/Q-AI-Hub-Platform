package tn.enicarthage.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResendOtpRequest {
    @NotBlank
    private String otpSessionId;
}
