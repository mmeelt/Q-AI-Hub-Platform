package tn.enicarthage.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Notification;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.NotificationRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public Notification createNotification(String userId, String title, String message, String type) {
        return createNotification(userId, title, message, type, null);
    }

    @Transactional
    public Notification createNotification(String userId, String title, String message, String type, String callToActionUrl) {
        Notification notification = Notification.builder()
                .notificationId(UUID.randomUUID().toString())
                .targetUserId(userId)
                .notificationTitle(title)
                .notificationMessage(message)
                .notificationType(type)
                .callToActionUrl(callToActionUrl)
                .isReadStatus(false)
                .notificationCreatedAt(new java.util.Date())
                .build();
        return notificationRepository.save(notification);

    }

    public List<Notification> getUserNotifications(String userId) {
        return notificationRepository.findByTargetUserIdOrderByNotificationCreatedAtDesc(userId);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByTargetUserIdAndIsReadStatusFalse(userId);
    }

    @Transactional
    public void markAsRead(String notificationId, String userId) {
        Notification n = getOwnedNotification(notificationId, userId);
        n.setIsReadStatus(true);
        notificationRepository.save(n);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        notificationRepository.markAllAsRead(userId);
    }

    @Transactional
    public void deleteNotification(String notificationId, String userId) {
        notificationRepository.delete(getOwnedNotification(notificationId, userId));
    }

    // A notification belonging to someone else is reported as not found (no information leak).
    private Notification getOwnedNotification(String notificationId, String userId) {
        return notificationRepository.findById(notificationId)
                .filter(n -> userId != null && userId.equals(n.getTargetUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
    }
}
