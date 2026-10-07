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
}
