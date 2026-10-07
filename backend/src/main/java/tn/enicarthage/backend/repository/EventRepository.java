package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, String> {

    List<Event> findByStatus(Event.EventStatus status);
    List<Event> findByCategory(String category);
    List<Event> findByEventType(Event.EventType eventType);
    List<Event> findByOrganizerAdminId(String organizerAdminId);
    List<Event> findByApplicationDeadlineAfter(LocalDate date);

    @Query("SELECT e FROM Event e WHERE e.status = 'ACTIVE' AND " +
            "(e.maxParticipants IS NULL OR e.currentRegisteredCount < e.maxParticipants)")
    List<Event> findOpenAndAvailableEvents();

    @Query("SELECT e FROM Event e JOIN e.expertInvitations ei WHERE LOWER(ei.email) = LOWER(:email)")
    List<Event> findByExpertEmail(String email);
}
