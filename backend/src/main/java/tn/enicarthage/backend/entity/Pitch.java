package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "pitches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pitch {

    @Id
    @Builder.Default
    private String pitchId = UUID.randomUUID().toString();

    @Column(name = "presenting_startup_id")
    private String presentingStartupId;

    @Column(name = "target_event_id")
    private String targetEventId;

    private String pitchTitle;

    @Column(columnDefinition = "TEXT")
    private String pitchDescription;

    private String presentationDeckUrl;
    private String presentationVideoUrl;

    @Temporal(TemporalType.TIMESTAMP)
    private Date scheduledPresentationDate;

    private String presentationVenue;
    private String pitchStatus;
}
