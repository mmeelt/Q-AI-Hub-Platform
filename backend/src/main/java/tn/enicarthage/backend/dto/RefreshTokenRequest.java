package tn.enicarthage.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshTokenRequest {
    @NotBlank(message = "refreshToken must not be blank")
    private String refreshToken;
}
