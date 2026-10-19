-- =====================================================================
-- V8 - Expert grades on applications: each invited expert grades each
-- application once (/20); the admin sees every grade and the average.
-- =====================================================================
CREATE TABLE application_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    application_id VARCHAR(255) NOT NULL,
    reviewer_user_id VARCHAR(255) NOT NULL,
    reviewer_email VARCHAR(255) NULL,
    reviewer_name VARCHAR(255) NULL,
    score DOUBLE NOT NULL,
    recommendation VARCHAR(16) NOT NULL,
    comment TEXT NULL,
    reviewed_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_application_review_reviewer UNIQUE (application_id, reviewer_user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_application_reviews_application ON application_reviews (application_id);
