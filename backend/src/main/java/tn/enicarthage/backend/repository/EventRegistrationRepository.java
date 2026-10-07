package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.EventRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EventRegistrationRepository extends JpaRepository<EventRegistration, Long> {

    @Query("SELECT r FROM EventRegistration r JOIN FETCH r.event WHERE r.event.eventId = :eventId")
    List<EventRegistration> findByEventId(@Param("eventId") String eventId);

    @Query("SELECT COUNT(r) > 0 FROM EventRegistration r WHERE r.event.eventId = :eventId AND LOWER(r.participantEmail) = LOWER(:email)")
    boolean existsByEventIdAndParticipantEmail(@Param("eventId") String eventId, @Param("email") String email);

    @Query("SELECT r FROM EventRegistration r JOIN FETCH r.event WHERE LOWER(r.participantEmail) = LOWER(:participantEmail)")
    List<EventRegistration> findByParticipantEmail(@Param("participantEmail") String participantEmail);
}
