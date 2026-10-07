package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private String userId;

    @Column(unique = true, nullable = false)
    private String emailAddress;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(nullable = false)
    private String passwordHash;

    private String fullName;
    private String studentId;
    private String avatarUrl;
    private String phoneNumber;
    private String userBio;
    private String universityName;
    private String studyField;
    private String primaryInterest;

    @ElementCollection
    @CollectionTable(name = "user_availability", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "availability_slot")
    private List<String> availability;

    @ElementCollection
    @CollectionTable(name = "user_skills", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "skill")
    private List<String> userSkills;

    @Column(columnDefinition = "TEXT")
    private String notificationPrefs;

    @Temporal(TemporalType.DATE)
    private Date dateOfBirth;

    @Temporal(TemporalType.TIMESTAMP)
    private Date accountCreatedAt;

    private Integer failedLoginAttempts;

    // Set the first time the user enters a code received by email
    private Boolean emailVerified;
    
    private Boolean accountLocked;
    
    @Temporal(TemporalType.TIMESTAMP)
    private Date lockoutEndTime;

    @Enumerated(EnumType.STRING)
    private ExpertRole expertRole;

    @Enumerated(EnumType.STRING)
    private UserStatus userStatus;

    public enum ExpertRole {
        MENTOR, JUDGE, EVALUATOR, TECHNICAL_EXPERT, FINANCE_EXPERT, FIELD_EXPERT;

        /**
         * Accepts both enum names ("FIELD_EXPERT") and the admin UI labels ("Field Expert").
         * UI-only specialities without their own permission set ("Legal Expert", "Marketing Expert")
         * get the FIELD_EXPERT permissions; the label itself stays on the event invitation.
         */
        public static ExpertRole fromLabel(String raw) {
            if (raw == null || raw.isBlank()) throw new IllegalArgumentException("Expert role is required");
            String normalized = raw.trim().toUpperCase().replaceAll("[\\s-]+", "_");
            try {
                return valueOf(normalized);
            } catch (IllegalArgumentException e) {
                if (normalized.endsWith("_EXPERT")) return FIELD_EXPERT;
                throw e;
            }
        }
    }
    public enum UserStatus { ACTIVE, INACTIVE, SUSPENDED }
}
