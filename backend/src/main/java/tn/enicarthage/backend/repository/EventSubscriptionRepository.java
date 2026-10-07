package tn.enicarthage.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.enicarthage.backend.entity.EventSubscription;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventSubscriptionRepository extends JpaRepository<EventSubscription, Long> {
    Optional<EventSubscription> findByEventIdAndEmailIgnoreCase(String eventId, String email);
    List<EventSubscription> findByEventIdAndNotifiedAtIsNull(String eventId);
    List<EventSubscription> findByEmailIgnoreCaseAndNotifiedAtIsNull(String email);
}
