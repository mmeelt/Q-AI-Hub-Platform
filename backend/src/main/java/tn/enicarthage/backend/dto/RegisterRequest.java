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

    // Filled in by invited experts instead of the university / student id
    private String phoneNumber;
    private String organization;
    private String jobTitle;
    private String expertiseArea;
    private String linkedinUrl;
    private String userBio;
}
