package tn.enicarthage.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class UserProfileResponse {
    private String userId;
    private String emailAddress;
    private String fullName;
    private String universityName;
    private String studentId;
    private String phoneNumber;
    private String studyField;
    private List<String> userSkills;
    private String avatarUrl;
    private String userBio;
    private String primaryInterest;
    private List<String> availability;
}
