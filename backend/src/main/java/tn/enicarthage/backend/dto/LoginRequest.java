package tn.enicarthage.backend.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String password;

    // "Remember me": keep the session after the browser is closed (default: no)
    private Boolean rememberMe;
}
