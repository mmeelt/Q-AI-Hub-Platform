package tn.enicarthage.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String phoneNumber;
    private String userBio;
    private String universityName;
    private String studyField;
    private List<String> userSkills;
    private String avatarUrl;
    private String primaryInterest;
    private List<String> availability;
    private String studentId;
    // Invited experts' professional details
    private String organization;
    private String jobTitle;
    private String expertiseArea;
    private String linkedinUrl;
}
