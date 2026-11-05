-- ====================================================================
-- Database Schema DDL for MEOW MATCH Application (Oracle SQL Dialect)
-- ====================================================================

-- 1. Table: USERS
CREATE TABLE USERS (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR2(255) NOT NULL,
    role        VARCHAR2(16) NOT NULL,
    phone       VARCHAR2(32),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_user_role CHECK (role IN ('Owner', 'Finder'))
);

-- 2. Table: PET_PROFILES
CREATE TABLE PET_PROFILES (
    id                 NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id           NUMBER NOT NULL,
    cat_name           VARCHAR2(255) NOT NULL,
    breed              VARCHAR2(128),
    features           CLOB,
    face_id_vector_ref VARCHAR2(255),
    passport_status    VARCHAR2(16) DEFAULT 'Free' NOT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_pet_owner FOREIGN KEY (owner_id) REFERENCES USERS(id) ON DELETE CASCADE,
    CONSTRAINT check_passport_status CHECK (passport_status IN ('Free', 'Premium'))
);

-- Index for FK to optimize query performance and avoid lock contention in Oracle
CREATE INDEX idx_pet_owner_id ON PET_PROFILES(owner_id);

-- 3. Table: LOST_REPORTS
CREATE TABLE LOST_REPORTS (
    id                    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pet_id                NUMBER NOT NULL,
    missing_location      VARCHAR2(512) NOT NULL,
    alert_radius_km       NUMBER(5, 2) DEFAULT 1.0 NOT NULL,
    reward_amount         NUMBER DEFAULT 0 NOT NULL,
    status                VARCHAR2(16) DEFAULT 'Active' NOT NULL,
    premium_priority_flag NUMBER(1) DEFAULT 0 NOT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_report_pet FOREIGN KEY (pet_id) REFERENCES PET_PROFILES(id) ON DELETE CASCADE,
    CONSTRAINT check_report_status CHECK (status IN ('Active', 'Resolved')),
    CONSTRAINT check_priority_flag CHECK (premium_priority_flag IN (0, 1))
);

CREATE INDEX idx_report_pet_id ON LOST_REPORTS(pet_id);

-- 4. Table: FINDER_CHECKINS
CREATE TABLE FINDER_CHECKINS (
    id                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id         NUMBER NOT NULL,
    finder_id         NUMBER NOT NULL,
    checkin_location  VARCHAR2(512) NOT NULL,
    confidence_score  NUMBER(5, 2) DEFAULT 0.0 NOT NULL,
    photo_metadata    CLOB,
    checked_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_checkin_report FOREIGN KEY (report_id) REFERENCES LOST_REPORTS(id) ON DELETE CASCADE,
    CONSTRAINT fk_checkin_finder FOREIGN KEY (finder_id) REFERENCES USERS(id) ON DELETE CASCADE,
    CONSTRAINT check_photo_metadata_json CHECK (photo_metadata IS JSON)
);

CREATE INDEX idx_checkin_report_id ON FINDER_CHECKINS(report_id);
CREATE INDEX idx_checkin_finder_id ON FINDER_CHECKINS(finder_id);

-- 5. Table: ESCROW_TRANSACTIONS
CREATE TABLE ESCROW_TRANSACTIONS (
    id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id     NUMBER NOT NULL,
    amount_held   NUMBER NOT NULL,
    platform_fee  NUMBER NOT NULL,
    payout_status VARCHAR2(16) DEFAULT 'Held' NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_escrow_report FOREIGN KEY (report_id) REFERENCES LOST_REPORTS(id) ON DELETE CASCADE,
    CONSTRAINT check_payout_status CHECK (payout_status IN ('Held', 'Released'))
);

CREATE INDEX idx_escrow_report_id ON ESCROW_TRANSACTIONS(report_id);
