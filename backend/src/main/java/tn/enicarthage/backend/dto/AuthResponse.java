package tn.enicarthage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private Long accessTokenExpiresIn;
    private String userId;
    private String email;
    private String role;
    private String fullName;
}
