package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;

@Entity
@Table(name = "invitation_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvitationLog {

    @Id
    private String invitationId;
    private String email;
    private String expertRole;
    private String eventId;

    @Temporal(TemporalType.TIMESTAMP)
    private Date invitedAt;

    /** Set when a user successfully registers using this invitation (one-time use). */
    @Temporal(TemporalType.TIMESTAMP)
    private Date consumedAt;
}
