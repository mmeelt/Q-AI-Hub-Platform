package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import java.util.Date;

@Entity
@Table(name = "otp_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtpToken {
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(columnDefinition = "VARCHAR(36)")
    private String id;

    @Column(nullable = false, unique = true)
    private String otpSessionId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String otpCode;

    @Column(nullable = false)
    private Date expiryTime;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isUsed = false;

    @Builder.Default
    @Column(nullable = false)
    private Integer attempts = 0;

    @Column(nullable = false, updatable = false)
    private Date createdAt;

    public static final String LOGIN = "LOGIN";
    public static final String PASSWORD_RESET = "PASSWORD_RESET";

    // What the code is for: a reset code cannot log in, a login code cannot reset a password.
    // Null (rows created before this column existed) means LOGIN.
    @Column(length = 20)
    private String purpose;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = new Date();
        if (isUsed == null) isUsed = false;
        if (attempts == null) attempts = 0;
    }
}
