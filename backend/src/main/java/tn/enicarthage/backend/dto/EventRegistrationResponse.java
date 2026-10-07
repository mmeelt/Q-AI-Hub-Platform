package tn.enicarthage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EventRegistrationResponse {
    private Long id;
    private String eventId;
    private String eventTitle;
    private String participantName;
    private String participantEmail;
    private String answersJson;
    private LocalDateTime registeredAt;
}
