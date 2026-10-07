package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;

@Entity
@Table(name = "platform_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSetting {

    @Id
    private String settingsId;

    private Boolean allowPublicRegistrations;
    private Boolean requireEmailVerification;
    private Boolean allowLateSubmissions;
    private Boolean showAnonymousToJury;

    @Column(columnDefinition = "TEXT")
    private String globalQuestionBank;

    @Column(columnDefinition = "TEXT")
    private String globalStartupFormFields;

    @Temporal(TemporalType.TIMESTAMP)
    private Date lastUpdatedAt;
}
