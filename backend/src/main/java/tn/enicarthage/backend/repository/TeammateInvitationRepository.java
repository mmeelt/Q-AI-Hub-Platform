package tn.enicarthage.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.enicarthage.backend.entity.TeammateInvitation;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeammateInvitationRepository extends JpaRepository<TeammateInvitation, String> {
    List<TeammateInvitation> findByInviteeEmail(String email);
    List<TeammateInvitation> findByStartupId(String startupId);
    List<TeammateInvitation> findByStartupIdAndStatus(String startupId, TeammateInvitation.InvitationStatus status);
    Optional<TeammateInvitation> findByStartupIdAndInviteeEmail(String startupId, String email);
    List<TeammateInvitation> findByInviteeEmailAndStatus(String email, TeammateInvitation.InvitationStatus status);
}
