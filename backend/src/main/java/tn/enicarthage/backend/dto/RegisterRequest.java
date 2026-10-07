package tn.enicarthage.backend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String fullName;
    private String universityName;
    private String studentId;
    /** Opaque invitation id from the invite link (`invite` query param). */
    private String inviteToken;
}
