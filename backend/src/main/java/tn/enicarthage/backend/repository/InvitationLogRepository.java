package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.InvitationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvitationLogRepository extends JpaRepository<InvitationLog, String> {
}
