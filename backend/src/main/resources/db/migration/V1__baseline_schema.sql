-- =====================================================================
-- V1 - Baseline schema of Q-AI Hub (MySQL 8), generated from the JPA entities.
--
-- New database  : Flyway runs this script to create every table.
-- Existing database (created earlier by Hibernate ddl-auto): Flyway marks it
-- as version 1 (spring.flyway.baseline-on-migrate) and does NOT run this file.
--
-- Never edit an applied migration: add a new V<n>__description.sql instead.
-- =====================================================================

    create table admin_permissions (
        admin_id varchar(255) not null,
        permission varchar(255)
    ) engine=InnoDB;

    create table admins (
        last_sign_in_at datetime(6),
        admin_email varchar(255) not null,
        admin_id varchar(255) not null,
        admin_name varchar(255),
        admin_role varchar(255),
        department_name varchar(255),
        password_hash varchar(255) not null,
        primary key (admin_id)
    ) engine=InnoDB;

    create table applications (
        application_submitted_at datetime(6),
        pitch_date datetime(6),
        applicant_user_id varchar(255),
        application_id varchar(255) not null,
        application_status varchar(255),
        followup_answers_json TEXT,
        followup_questions_json TEXT,
        followup_status varchar(255),
        initial_application_answers TEXT,
        linked_startup_id varchar(255),
        rejection_reason TEXT,
        target_event_id varchar(255),
        tracking_code varchar(255),
        primary key (application_id)
    ) engine=InnoDB;

    create table event_experts (
        invited_at datetime(6),
        email varchar(255),
        event_id varchar(255) not null,
        role varchar(255)
    ) engine=InnoDB;

    create table event_partners (
        event_id varchar(255) not null,
        partner varchar(255)
    ) engine=InnoDB;

    create table event_registrations (
        id bigint not null auto_increment,
        registered_at datetime(6) not null,
        answers_json TEXT,
        event_id varchar(255) not null,
        participant_email varchar(255) not null,
        participant_name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table event_tags (
        event_id varchar(255) not null,
        tag varchar(255)
    ) engine=InnoDB;

    create table events (
        application_deadline date,
        current_registered_count integer,
        end_date date,
        has_pitch bit not null,
        max_participants integer,
        start_date date,
        category varchar(255) not null,
        cover_image_url varchar(255),
        description TEXT,
        event_id varchar(255) not null,
        form_fields_json TEXT,
        location varchar(255),
        organizer_admin_id varchar(255),
        title varchar(255) not null,
        event_type enum ('INCUBATION','SIMPLE') not null,
        status enum ('ACTIVE','CLOSED','DRAFT') not null,
        primary key (event_id)
    ) engine=InnoDB;

    create table invitation_logs (
        consumed_at datetime(6),
        invited_at datetime(6),
        email varchar(255),
        event_id varchar(255),
        expert_role varchar(255),
        invitation_id varchar(255) not null,
        primary key (invitation_id)
    ) engine=InnoDB;

    create table notifications (
        is_read_status bit,
        notification_created_at datetime(6),
        call_to_action_url varchar(255),
        notification_id varchar(255) not null,
        notification_message TEXT,
        notification_title varchar(255),
        notification_type varchar(255),
        target_user_id varchar(255),
        primary key (notification_id)
    ) engine=InnoDB;

    create table otp_tokens (
        attempts integer not null,
        is_used bit not null,
        created_at datetime(6) not null,
        expiry_time datetime(6) not null,
        id VARCHAR(36) not null,
        otp_code varchar(255) not null,
        otp_session_id varchar(255) not null,
        user_id varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table phase_submissions (
        evaluation_score float(53),
        id bigint not null auto_increment,
        submitted_at datetime(6) not null,
        answers_json TEXT,
        evaluator_feedback TEXT,
        phase_id varchar(255) not null,
        source_application_id varchar(255),
        decision_status enum ('ACCEPTED','PENDING','REJECTED') not null,
        status enum ('DRAFT','GRADED','SUBMITTED') not null,
        primary key (id)
    ) engine=InnoDB;

    create table phases (
        end_date date,
        phase_active bit not null,
        phase_locked bit not null,
        phase_order integer not null,
        start_date date,
        event_id varchar(255) not null,
        form_fields_json TEXT,
        phase_id varchar(255) not null,
        phase_name varchar(255) not null,
        phase_type varchar(255) default 'QUESTIONNAIRE',
        primary key (phase_id)
    ) engine=InnoDB;

    create table pitch_evaluations (
        final_total_score float(53),
        score_business_model integer,
        score_innovation integer,
        score_market_potential integer,
        score_oral_presentation integer,
        score_team_capability integer,
        score_technical_depth integer,
        evaluation_submitted_at datetime(6),
        ai_generated_feedback TEXT,
        application_id varchar(255),
        evaluation_id varchar(255) not null,
        evaluator_admin_id varchar(255),
        evaluator_notes TEXT,
        final_decision varchar(255),
        pitch_phase_id varchar(255),
        primary key (evaluation_id)
    ) engine=InnoDB;

    create table pitch_round_results (
        total_score float(53),
        evaluated_at datetime(6),
        id bigint not null auto_increment,
        pitch_round_id bigint not null,
        ai_feedback TEXT,
        application_id varchar(255),
        evaluated_by varchar(255),
        feedback TEXT,
        scores_json TEXT,
        decision enum ('PASSED','REJECTED'),
        primary key (id)
    ) engine=InnoDB;

    create table pitch_rounds (
        round_number integer not null,
        id bigint not null auto_increment,
        results_sent_at datetime(6),
        round_date datetime(6),
        criteria_json TEXT,
        phase_id varchar(255) not null,
        round_name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table pitches (
        scheduled_presentation_date datetime(6),
        pitch_description TEXT,
        pitch_id varchar(255) not null,
        pitch_status varchar(255),
        pitch_title varchar(255),
        presentation_deck_url varchar(255),
        presentation_venue varchar(255),
        presentation_video_url varchar(255),
        presenting_startup_id varchar(255),
        target_event_id varchar(255),
        primary key (pitch_id)
    ) engine=InnoDB;

    create table platform_settings (
        allow_late_submissions bit,
        allow_public_registrations bit,
        require_email_verification bit,
        show_anonymous_to_jury bit,
        last_updated_at datetime(6),
        global_question_bank TEXT,
        global_startup_form_fields TEXT,
        settings_id varchar(255) not null,
        primary key (settings_id)
    ) engine=InnoDB;

    create table refresh_tokens (
        is_revoked bit not null,
        created_at datetime(6) not null,
        expiry_date datetime(6) not null,
        id VARCHAR(36) not null,
        token varchar(255) not null,
        user_id varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table revoked_tokens (
        revoked_at datetime(6),
        jti varchar(255) not null,
        primary key (jti)
    ) engine=InnoDB;

    create table startup_co_founders (
        co_founder_name varchar(255),
        startup_id varchar(255) not null
    ) engine=InnoDB;

    create table startups (
        accuracy_rate_pct float(53),
        current_team_size integer,
        developer_progress_pct integer,
        growth_rate_pct float(53),
        is_using_ai_description bit,
        monthly_burn_rate decimal(38,2),
        monthly_revenue decimal(38,2),
        overall_progress_pct integer,
        total_funding_raised decimal(19,4),
        ai_generated_description TEXT,
        business_sector varchar(255),
        company_logo_url varchar(255),
        company_tagline varchar(255),
        company_website_url varchar(255),
        founder_user_id varchar(255) not null,
        pitch_deck_link varchar(255),
        pitch_video_link varchar(255),
        primary_founder_name varchar(255),
        project_name varchar(255),
        raw_description TEXT,
        specific_industry varchar(255),
        startup_form_answers TEXT,
        startup_id varchar(255) not null,
        startup_stage varchar(255),
        startup_status enum ('ACTIVE','DRAFT','INACTIVE'),
        primary key (startup_id)
    ) engine=InnoDB;

    create table teammate_invitations (
        invited_at datetime(6),
        responded_at datetime(6),
        personal_message varchar(1000),
        application_id varchar(255),
        id varchar(255) not null,
        invitee_email varchar(255),
        invitee_role varchar(255),
        inviter_user_id varchar(255),
        startup_id varchar(255),
        status enum ('ACCEPTED','DECLINED','PENDING'),
        primary key (id)
    ) engine=InnoDB;

    create table user_availability (
        availability_slot varchar(255),
        user_id varchar(255) not null
    ) engine=InnoDB;

    create table user_skills (
        skill varchar(255),
        user_id varchar(255) not null
    ) engine=InnoDB;

    create table users (
        account_locked bit,
        date_of_birth date,
        failed_login_attempts integer,
        account_created_at datetime(6),
        lockout_end_time datetime(6),
        avatar_url varchar(255),
        email_address varchar(255) not null,
        full_name varchar(255),
        notification_prefs TEXT,
        password_hash varchar(255) not null,
        phone_number varchar(255),
        primary_interest varchar(255),
        student_id varchar(255),
        study_field varchar(255),
        university_name varchar(255),
        user_bio varchar(255),
        user_id varchar(255) not null,
        expert_role enum ('EVALUATOR','FIELD_EXPERT','FINANCE_EXPERT','JUDGE','MENTOR','TECHNICAL_EXPERT'),
        user_status enum ('ACTIVE','INACTIVE','SUSPENDED'),
        primary key (user_id)
    ) engine=InnoDB;

    alter table admins 
       add constraint UKeoomxwhv11jtwt1lqr3h1nf4h unique (admin_email);

    alter table otp_tokens 
       add constraint UKtnp8ht1i6fy6nl22dwvqrp7so unique (otp_session_id);

    alter table pitch_evaluations 
       add constraint UKljdwtku25vsjgyot4grpehab1 unique (application_id);

    alter table refresh_tokens 
       add constraint UKghpmfn23vmxfu3spu3lfg4r2d unique (token);

    alter table users 
       add constraint UK1ar956vx8jufbghpyi09yr16l unique (email_address);

    alter table admin_permissions 
       add constraint FK7vyuc2dwnyqi0v44ab5n5faca 
       foreign key (admin_id) 
       references admins (admin_id);

    alter table event_experts 
       add constraint FK5m6viuhvvbmyel2l34kt9lcc5 
       foreign key (event_id) 
       references events (event_id);

    alter table event_partners 
       add constraint FKbmnipctkd9ix5f4ldecvvrvvw 
       foreign key (event_id) 
       references events (event_id);

    alter table event_registrations 
       add constraint FK6eykq6wu4n23qhn5vwb8kyut5 
       foreign key (event_id) 
       references events (event_id);

    alter table event_tags 
       add constraint FKiwoyitw224ykom58m5xnoa9y6 
       foreign key (event_id) 
       references events (event_id);

    alter table phase_submissions 
       add constraint FK26ludi9oy7jsy48bdcboivkxr 
       foreign key (phase_id) 
       references phases (phase_id);

    alter table phases 
       add constraint FKqdkrr0bdvhuyfu4jgw0lrf5q6 
       foreign key (event_id) 
       references events (event_id);

    alter table pitch_round_results 
       add constraint FK5ii7akqd986vtq0pt8ge9wikb 
       foreign key (pitch_round_id) 
       references pitch_rounds (id);

    alter table pitch_rounds 
       add constraint FK5pi4wsifrc4jakqsseblf1eix 
       foreign key (phase_id) 
       references phases (phase_id);

    alter table startup_co_founders 
       add constraint FK4djekuiku7tuy0c0ml6jrmi0g 
       foreign key (startup_id) 
       references startups (startup_id);

    alter table user_availability 
       add constraint FKh3g4yjvo392hpgfk55231cjfm 
       foreign key (user_id) 
       references users (user_id);

    alter table user_skills 
       add constraint FKro13if9r7fwkr5115715127ai 
       foreign key (user_id) 
       references users (user_id);
