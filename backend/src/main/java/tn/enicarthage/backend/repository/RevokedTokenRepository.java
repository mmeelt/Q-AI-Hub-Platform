package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Date;

@Repository
public interface RevokedTokenRepository extends JpaRepository<RevokedToken, String> {
    void deleteByRevokedAtBefore(Date expiryThreshold);
}
