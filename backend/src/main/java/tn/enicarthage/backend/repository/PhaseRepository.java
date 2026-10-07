package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.Phase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PhaseRepository extends JpaRepository<Phase, String> {

    // Find all phases of a specific event ordered by phase order
    @Query("SELECT p FROM Phase p WHERE p.eventId = :eventId ORDER BY p.phaseOrder ASC")
    List<Phase> findByEventIdOrderByPhaseOrderAsc(@Param("eventId") String eventId);

    // Find the active phase of a specific event
    @Query("SELECT p FROM Phase p WHERE p.eventId = :eventId AND p.phaseActive = true")
    Optional<Phase> findByEventIdAndPhaseActiveTrue(@Param("eventId") String eventId);

    // Find a specific phase by event and order
    @Query("SELECT p FROM Phase p WHERE p.eventId = :eventId AND p.phaseOrder = :phaseOrder")
    Optional<Phase> findByEventIdAndPhaseOrder(@Param("eventId") String eventId, @Param("phaseOrder") Integer phaseOrder);
}
