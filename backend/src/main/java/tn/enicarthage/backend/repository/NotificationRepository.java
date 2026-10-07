package tn.enicarthage.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tn.enicarthage.backend.entity.Notification;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    
    List<Notification> findByTargetUserIdOrderByNotificationCreatedAtDesc(String targetUserId);
    
    long countByTargetUserIdAndIsReadStatusFalse(String targetUserId);
    
    @Modifying
    @Query("UPDATE Notification n SET n.isReadStatus = true WHERE n.targetUserId = ?1")
    void markAllAsRead(String targetUserId);
}
