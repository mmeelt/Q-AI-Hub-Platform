-- =====================================================================
-- V6 - "Notify me" on coming-soon events: who to email when the event opens.
-- =====================================================================
CREATE TABLE event_subscriptions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    event_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL,
    notified_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_event_subscription UNIQUE (event_id, email)
) ENGINE=InnoDB;

CREATE INDEX idx_event_subscriptions_event ON event_subscriptions (event_id, notified_at);
