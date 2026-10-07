package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @Builder.Default
    private String notificationId = UUID.randomUUID().toString();

    @Column(name = "target_user_id")
    private String targetUserId;

    private String notificationType;
    private String notificationTitle;

    @Column(columnDefinition = "TEXT")
    private String notificationMessage;

    private String callToActionUrl;

    @Column(name = "is_read_status")
    @Builder.Default
    private Boolean isReadStatus = false;

    @Temporal(TemporalType.TIMESTAMP)
    @Builder.Default
    private Date notificationCreatedAt = new Date();
}
