package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "teammate_invitations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeammateInvitation {

    @Id
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    private String startupId;
    private String applicationId;
    private String inviterUserId;
    private String inviteeEmail;
    private String inviteeRole;
    @Column(length = 1000)
    private String personalMessage;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    @Temporal(TemporalType.TIMESTAMP)
    @Builder.Default
    private Date invitedAt = new Date();

    @Temporal(TemporalType.TIMESTAMP)
    private Date respondedAt;

    public enum InvitationStatus { PENDING, ACCEPTED, DECLINED }
}
