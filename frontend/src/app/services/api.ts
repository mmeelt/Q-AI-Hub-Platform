/**
 * API Bridge for Q-AI Hub
 * This file handles all communication between the React frontend and Spring Boot backend.
 */

import { clearAuth, isLoggedIn } from '../utils/localStorage';

const BASE_URL = '/api';

// One refresh at a time: parallel 401s wait for the same refresh call
let refreshInFlight: Promise<boolean> | null = null;
const getApiErrorMessage = (errorData: any, fallback: string) =>
    errorData?.message || errorData?.error || fallback;

export const api = {
    /**
     * Authenticates a user and returns a login response (email, sessionId, etc).
     */
    // Usually returns an otpSessionId (code emailed). When the email is already verified and the admin
    // turned off "code at every login", returns requiresOtp=false + the profile (session cookies are set).
    async login(email: string, password: string, rememberMe = false): Promise<{ requiresOtp?: boolean; otpSessionId?: string; email?: string; role?: string; fullName?: string; userId?: string }> {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, rememberMe }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Invalid email or password'));
        }

        return await response.json();
    },

    /**
     * Authenticates an admin and returns JWT tokens directly (no OTP required).
     */
    async adminLogin(email: string, password: string): Promise<{ requiresOtp: boolean; otpSessionId: string; message: string; expiresIn: number }> {
        const response = await fetch(`${BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Invalid admin credentials'));
        }

        return await response.json();
    },

    /**
     * Verifies the 6-digit OTP and returns a JWT token.
     */
    // On success the API sets the session cookies; the body only carries the profile
    // rememberMe: keep the session after the browser is closed (otherwise it ends with the browser)
    async verifyOtp(email: string, otpCode: string, otpSessionId: string, rememberMe = false): Promise<{ email: string; userId?: string; role: string; fullName: string }> {
        const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ otpSessionId, otpCode, rememberMe }),  // Remove email - backend expects only these two fields
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Invalid or expired code'));
        }

        return await response.json();
    },

    /**
     * Helper to perform authenticated fetch requests.
     */
    async authFetch(url: string, options: RequestInit = {}) {
        // The HttpOnly session cookie is sent automatically (same origin); no token in JavaScript
        const isFormData = options.body instanceof FormData;
        const headers = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...options.headers,
        };
        const send = () => fetch(`${BASE_URL}${url}`, { ...options, headers, credentials: 'same-origin' });

        let response = await send();
        if (response.status === 401 && isLoggedIn()) {
            if (!refreshInFlight) {
                refreshInFlight = this.refreshSession().finally(() => { refreshInFlight = null; });
            }
            if (await refreshInFlight) {
                response = await send();
            } else {
                clearAuth();
                window.location.href = '/login';
            }
        }
        return response;
    },

    /**
     * Registers a new student user.
     */
    async register(data: any): Promise<{ requiresOtp: boolean; otpSessionId: string; message: string }> {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Registration failed'));
        }

        return await response.json();
    },

    /**
     * Fetches the current user's applications.
     */
    async getMyApplications(): Promise<any[]> {
        const response = await this.authFetch('/applications/my');
        if (!response.ok) throw new Error('Failed to fetch applications');
        return await response.json();
    },


    /**
     * Fetches the current user's notifications.
     */
    async getNotifications(): Promise<any[]> {
        const response = await this.authFetch('/notifications');
        if (!response.ok) throw new Error('Failed to fetch notifications');
        return await response.json();
    },

    /**
     * Fetches dashboard statistics (Admin).
     */
    async getDashboardStats(): Promise<any> {
        const response = await this.authFetch('/dashboard/stats');
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        return await response.json();
    },

    /**
     * Fetches the current user's profile.
     */
    async getProfile(): Promise<any> {
        const response = await this.authFetch('/users/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        return await response.json();
    },

    /**
     * Fetches all events.
     */
    async getEvents(): Promise<any[]> {
        const response = await fetch(`${BASE_URL}/events`);
        if (!response.ok) throw new Error('Failed to fetch events');
        return await response.json();
    },

    /**
     * Fetches a single event by ID.
     */
    async getEventById(id: string | number): Promise<any> {
        const response = await this.authFetch(`/events/${id}`);
        if (!response.ok) throw new Error('Failed to fetch event');
        return await response.json();
    },

    /**
     * Fetches all startups (Admin).
     */
    async getStartups(): Promise<any[]> {
        const response = await this.authFetch('/admin/startups');
        if (!response.ok) throw new Error('Failed to fetch startups');
        return await response.json();
    },

    /**
     * Fetches registrations for the current user (SIMPLE events).
     */
    async getMyRegistrations(): Promise<any[]> {
        const response = await this.authFetch('/registrations/my');
        if (!response.ok) throw new Error('Failed to fetch registrations');
        return await response.json();
    },

    /**
     * Fetches all users (Admin).
     */
    async getUsers(): Promise<any[]> {
        const response = await this.authFetch('/admin/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        return await response.json();
    },

    async getUserApplicationsForAdmin(userId: string): Promise<any[]> {
        const response = await this.authFetch(`/admin/users/${userId}/applications`);
        if (!response.ok) throw new Error('Failed to fetch user applications');
        return await response.json();
    },


    async getPlatformSettings(): Promise<any> {
        const response = await this.authFetch('/settings');
        if (!response.ok) throw new Error('Failed to fetch platform settings');
        return await response.json();
    },

    /**
     * Fetches all events (Admin).
     */
    async getAdminEvents(): Promise<any[]> {
        const response = await this.authFetch('/admin/events');
        if (!response.ok) throw new Error('Failed to fetch admin events');
        return await response.json();
    },

    /**
     * Creates a new event (Admin).
     */
    async createEvent(eventData: any): Promise<any> {
        const response = await this.authFetch('/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to create event'));
        }
        return await response.json();
    },

    /**
     * Fetches the unread notification count for the current user.
     */
    async getUnreadNotificationCount(): Promise<number> {
        const response = await this.authFetch('/notifications/unread-count');
        if (!response.ok) throw new Error('Failed to fetch unread count');
        const data = await response.json();
        return data.unreadCount ?? 0;
    },

    /**
     * Marks a single notification as read.
     */
    async markNotificationRead(notificationId: string): Promise<void> {
        const response = await this.authFetch(`/notifications/${notificationId}/read`, { method: 'PUT' });
        if (!response.ok) throw new Error('Failed to mark notification as read');
    },

    /**
     * Marks all notifications for the current user as read.
     */
    async markAllNotificationsRead(): Promise<void> {
        const response = await this.authFetch('/notifications/read-all', { method: 'PUT' });
        if (!response.ok) throw new Error('Failed to mark all notifications as read');
    },

    /**
     * Deletes a notification by ID.
     */
    async deleteNotification(notificationId: string): Promise<void> {
        const response = await this.authFetch(`/notifications/${notificationId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete notification');
    },

    /**
     * Fetches a single application by ID (Admin/User).
     */
    async getApplicationById(id: string | number): Promise<any> {
        const response = await this.authFetch(`/applications/${id}`);
        if (!response.ok) throw new Error('Failed to fetch application');
        return await response.json();
    },

    /**
     * Updates a startup's metrics (Admin).
     */
    async updateStartupMetrics(id: string | number, metrics: any): Promise<any> {
        const response = await this.authFetch(`/admin/startups/${id}/metrics`, {
            method: 'PUT',
            body: JSON.stringify(metrics),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to update metrics'));
        }
        return await response.json();
    },

    /**
     * Updates an application status (Admin).
     */
    /**
     * Accepts an application by ID (Admin).
     */
    async acceptApplication(applicationId: string): Promise<any> {
        const response = await this.authFetch(`/applications/${applicationId}/accept`, { method: 'PUT' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to accept application'));
        }
        return await response.json();
    },

    /**
     * Rejects an application by ID with optional reason (Admin).
     */
    async rejectApplication(applicationId: string, reason?: string): Promise<any> {
        const response = await this.authFetch(`/applications/${applicationId}/reject`, {
            method: 'PUT',
            body: JSON.stringify({ reason: reason ?? '' }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to reject application'));
        }
        return await response.json();
    },

    async sendFollowupQuestions(applicationId: string, questions: string[]): Promise<any> {
        const response = await this.authFetch(`/applications/${applicationId}/followup-questions`, {
            method: 'PUT',
            body: JSON.stringify({ questionsJson: JSON.stringify(questions) }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(err, 'Failed to send follow-up questions'));
        }
        return await response.json();
    },

    async submitFollowupAnswers(applicationId: string, answers: string[]): Promise<any> {
        const response = await this.authFetch(`/applications/${applicationId}/followup-answers`, {
            method: 'PUT',
            body: JSON.stringify({ answersJson: JSON.stringify(answers) }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(err, 'Failed to submit follow-up answers'));
        }
        return await response.json();
    },

    /**
     * Resends the 6-digit OTP.
     */
    async resendOtp(otpSessionId: string): Promise<any> {
        const response = await fetch(`${BASE_URL}/auth/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otpSessionId }),
        });
        if (!response.ok) throw new Error('Failed to resend code');
        return await response.json();
    },

    /**
     * Changes the current user's password.
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const response = await this.authFetch('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to change password'));
        }
    },

    /**
     * Tracks an application status by tracking code (no auth required).
     */
    async trackApplication(trackingCode: string): Promise<any> {
        const response = await fetch(`${BASE_URL}/applications/track/${trackingCode}`);
        if (!response.ok) throw new Error('Tracking code not found');
        return await response.json();
    },

    // ── Auth ────────────────────────────────────────────────────────

    /** Revokes the session server-side and clears the cookies. */
    async logout(): Promise<boolean> {
        const response = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST', credentials: 'same-origin' });
        clearAuth();
        return response.ok;
    },

    /** Gets a new access cookie from the refresh cookie. Returns false when the session is over. */
    async refreshSession(): Promise<boolean> {
        try {
            const response = await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'same-origin' });
            return response.ok;
        } catch {
            return false;
        }
    },

    // ── Applications ─────────────────────────────────────────────────

    async submitApplicationWithAnswers(data: {
        targetEventId: string;
        linkedStartupId?: string;
        initialApplicationAnswers: string;
    }): Promise<any> {
        const response = await this.authFetch('/applications/submit', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(err, 'Failed to submit application'));
        }
        return await response.json();
    },

    async getApplicationsByEvent(eventId: string | number): Promise<any[]> {
        const response = await this.authFetch(`/applications/event/${eventId}`);
        if (!response.ok) throw new Error('Failed to fetch applications for event');
        return await response.json();
    },

    async submitPhaseAnswers(phaseId: string, applicationId: string, answersJson: string): Promise<any> {
        const response = await this.authFetch(`/submissions`, {
            method: 'POST',
            body: JSON.stringify({ phaseId, applicationId, answersJson }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(err, 'Failed to submit phase answers'));
        }
        return await response.json();
    },

    async getPhaseById(phaseId: string): Promise<any> {
        const response = await this.authFetch(`/phases/${phaseId}`);
        if (!response.ok) throw new Error('Failed to fetch phase');
        return await response.json();
    },

    async updatePhaseFormFields(phaseId: string, formFieldsJson: string): Promise<any> {
        const response = await this.authFetch(`/phases/${phaseId}/form-fields`, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: formFieldsJson,
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(err, 'Failed to update phase form fields'));
        }
        return await response.json();
    },

    async getSubmissionsByApplication(applicationId: string): Promise<any[]> {
        const response = await this.authFetch(`/submissions/application/${applicationId}`);
        if (!response.ok) throw new Error('Failed to fetch submissions for application');
        return await response.json();
    },

    async gradeSubmission(submissionId: number, score: number, feedback: string): Promise<any> {
        const response = await this.authFetch(`/submissions/${submissionId}/grade`, {
            method: 'PUT',
            body: JSON.stringify({ score, feedback }),
        });
        if (!response.ok) throw new Error('Failed to grade submission');
        return await response.json();
    },

    async decideSubmission(submissionId: number, decision: 'ACCEPTED' | 'REJECTED', feedback: string): Promise<any> {
        const response = await this.authFetch(`/submissions/${submissionId}/decide`, {
            method: 'PUT',
            body: JSON.stringify({ decision, feedback }),
        });
        if (!response.ok) throw new Error('Failed to record decision');
        return await response.json();
    },

    async getSubmissionsByPhase(phaseId: string): Promise<any[]> {
        const response = await this.authFetch(`/submissions/phase/${phaseId}`);
        if (!response.ok) throw new Error('Failed to fetch submissions');
        return await response.json();
    },

    async getDraftSubmissionCountByPhase(phaseId: string): Promise<number> {
        const response = await this.authFetch(`/submissions/phase/${phaseId}/draft-count`);
        if (!response.ok) throw new Error('Failed to fetch enrolled count');
        return await response.json();
    },

    async schedulePitch(applicationId: string, pitchDate: Date): Promise<any> {
        const response = await this.authFetch(`/applications/${applicationId}/pitch-date`, {
            method: 'PUT',
            body: JSON.stringify({ pitchDate }),
        });
        if (!response.ok) throw new Error('Failed to schedule pitch');
        return await response.json();
    },

    // --- Experts ---

    async getExpertEvents(): Promise<any[]> {
        const response = await this.authFetch('/events/expert-roles');
        if (!response.ok) throw new Error('Failed to fetch expert events');
        return await response.json();
    },

    async updateEvent(id: string | number, data: any): Promise<any> {
        const response = await this.authFetch(`/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update event');
        return await response.json();
    },

    async deleteEvent(id: string | number): Promise<void> {
        const response = await this.authFetch(`/events/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete event');
    },

    async activateEvent(id: string | number): Promise<any> {
        const response = await this.authFetch(`/events/${id}/activate`, { method: 'PUT' });
        if (!response.ok) throw new Error('Failed to activate event');
        return await response.json();
    },

    async closeEvent(id: string | number): Promise<any> {
        const response = await this.authFetch(`/events/${id}/close`, { method: 'PUT' });
        if (!response.ok) throw new Error('Failed to close event');
        return await response.json();
    },

    async advanceEventPhase(id: string | number): Promise<any> {
        const response = await this.authFetch(`/events/${id}/advance-phase`, { method: 'PUT' });
        if (!response.ok) throw new Error('Failed to advance phase');
        return await response.json();
    },

    // ── SIMPLE event registrations ────────────────────────────────────

    async registerForSimpleEvent(eventId: string | number, participantName: string, participantEmail: string, answersJson: string = '{}'): Promise<any> {
        const response = await fetch(`${BASE_URL}/registrations/event/${eventId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantName, participantEmail, answersJson }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Registration failed'));
        }
        return await response.json();
    },

    async getEventRegistrations(eventId: string | number): Promise<any[]> {
        const response = await this.authFetch(`/registrations/event/${eventId}`);
        if (!response.ok) throw new Error('Failed to fetch registrations');
        return await response.json();
    },

    async deleteRegistration(registrationId: number): Promise<void> {
        const response = await this.authFetch(`/registrations/${registrationId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete registration');
    },

    // ── Phases ────────────────────────────────────────────────────────

    async getPhasesByEvent(eventId: string): Promise<any[]> {
        const response = await this.authFetch(`/phases/event/${eventId}`);
        if (!response.ok) throw new Error('Failed to fetch phases');
        return await response.json();
    },

    async getActivePhase(eventId: string): Promise<any> {
        const response = await this.authFetch(`/phases/event/${eventId}/active`);
        if (!response.ok) throw new Error('Failed to fetch active phase');
        return await response.json();
    },

    async activatePhase(phaseId: string | number): Promise<any> {
        const response = await this.authFetch(`/phases/${phaseId}/activate`, { method: 'PUT' });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(err, 'Failed to activate phase'));
        }
        return await response.json();
    },

    // ── Pitch Rounds ──────────────────────────────────────────────────

    async getPitchRoundsByPhase(phaseId: string | number): Promise<any[]> {
        const response = await this.authFetch(`/pitch-rounds/phase/${phaseId}`);
        if (!response.ok) throw new Error('Failed to fetch pitch rounds');
        return await response.json();
    },

    async addPitchRound(phaseId: string | number, roundDate?: string): Promise<any> {
        const response = await this.authFetch(`/pitch-rounds/phase/${phaseId}`, {
            method: 'POST',
            body: JSON.stringify(roundDate ? { roundDate } : {}),
        });
        if (!response.ok) throw new Error('Failed to add pitch round');
        return await response.json();
    },

    async evaluatePitchRound(roundId: number, data: {
        applicationId: string;
        scoresJson: string;
        totalScore: number;
        decision: 'PASSED' | 'REJECTED';
        feedback: string;
        evaluatedBy?: string;
        aiFeedback?: string;
    }): Promise<any> {
        const response = await this.authFetch(`/pitch-rounds/${roundId}/evaluate`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to submit evaluation'));
        }
        return await response.json();
    },

    async getPitchRoundResults(roundId: number): Promise<any[]> {
        const response = await this.authFetch(`/pitch-rounds/${roundId}/results`);
        if (!response.ok) throw new Error('Failed to fetch results');
        return await response.json();
    },

    /** Startups that can be judged in a round (admin or judge of the event). */
    async getRoundCandidates(roundId: number): Promise<any[]> {
        const response = await this.authFetch(`/pitch-rounds/${roundId}/candidates`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to fetch candidates'));
        }
        return await response.json();
    },

    /** Admin: per startup, every judge's evaluation + average score + final decision. */
    async getRoundSummary(roundId: number): Promise<any[]> {
        const response = await this.authFetch(`/pitch-rounds/${roundId}/summary`);
        if (!response.ok) throw new Error('Failed to fetch round summary');
        return await response.json();
    },

    async getPassedByRound(roundId: number): Promise<any[]> {
        const response = await this.authFetch(`/pitch-rounds/${roundId}/passed`);
        if (!response.ok) throw new Error('Failed to fetch passed applications');
        return await response.json();
    },

    async getSubmissionsByEventAndPhaseOrder(eventId: string, order: number): Promise<any[]> {
        const response = await this.authFetch(`/submissions/event/${eventId}/phase/${order}`);
        if (!response.ok) throw new Error('Failed to fetch phase submissions');
        return await response.json();
    },

    async sendPitchRoundResults(roundId: number): Promise<any> {
        const response = await this.authFetch(`/pitch-rounds/${roundId}/send-results`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to send results');
        return await response.json();
    },

    async updateRoundCriteria(roundId: number, criteriaJson: string): Promise<any> {
        const response = await this.authFetch(`/pitch-rounds/${roundId}/criteria`, {
            method: 'PUT',
            body: JSON.stringify({ criteriaJson }),
        });
        if (!response.ok) throw new Error('Failed to update criteria');
        return await response.json();
    },

    // ── Startups ──────────────────────────────────────────────────────

    async createStartup(data: {
        projectName: string;
        businessSector: string;
        companyTagline?: string;
        rawDescription?: string;
        currentTeamSize?: number;
        coFounderNames?: string[];
        startupFormAnswers?: string;
    }): Promise<any> {
        const response = await this.authFetch('/startups', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to create startup'));
        }
        return await response.json();
    },

    async getMyStartup(): Promise<any[]> {
        const response = await this.authFetch('/users/my-startup');
        if (!response.ok) throw new Error('Failed to fetch startup');
        return await response.json();
    },

    async getMyStartups(): Promise<any[]> {
        const response = await this.authFetch('/startups/my');
        if (!response.ok) throw new Error('Failed to fetch startups');
        return await response.json();
    },

    async getStartupById(id: string): Promise<any> {
        const response = await this.authFetch(`/startups/${id}`);
        if (!response.ok) throw new Error('Failed to fetch startup');
        return await response.json();
    },

    async getStartupTeammates(startupId: string): Promise<any[]> {
        const response = await this.authFetch(`/startups/${startupId}/teammates`);
        if (!response.ok) throw new Error('Failed to fetch teammates');
        return await response.json();
    },

    async removeTeammate(startupId: string, invitationId: string): Promise<void> {
        const response = await this.authFetch(`/startups/${startupId}/teammates/${invitationId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to remove teammate');
    },

    async updateStartupProfile(startupId: string, data: any): Promise<void> {
        const response = await this.authFetch(`/startups/${startupId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to update startup'));
        }
    },

    async refineDescription(description: string): Promise<any> {
        const response = await this.authFetch('/startups/refine-description', {
            method: 'POST',
            body: JSON.stringify({ description }),
        });
        if (!response.ok) throw new Error('Failed to refine description');
        return await response.json();
    },

    // ── Users ─────────────────────────────────────────────────────────

    async updateProfile(data: {
        fullName?: string; userBio?: string; phoneNumber?: string;
        universityName?: string; studyField?: string; userSkills?: string[]; avatarUrl?: string;
        primaryInterest?: string; availability?: string[];
    }): Promise<void> {
        const response = await this.authFetch('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update profile');
    },

    async updateNotifPrefs(prefs: object): Promise<void> {
        const response = await this.authFetch('/users/notif-prefs', {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(prefs),
        });
        if (!response.ok) throw new Error('Failed to update preferences');
    },

    async manageUser(userId: string, action: 'SUSPEND' | 'RESTORE' | 'DELETE'): Promise<void> {
        const response = await this.authFetch(`/admin/users/${userId}/manage`, {
            method: 'POST',
            body: JSON.stringify({ action }),
        });
        if (!response.ok) throw new Error('Failed to manage user');
    },

    // ── File Upload ───────────────────────────────────────────────────

    /**
     * Uploads a file and returns its URL (/uploads/...). Uses XMLHttpRequest so large files
     * (pitch videos, up to 200 MB) can report progress (0-100) through onProgress.
     * Throws with the server's message (wrong type, too large...).
     */
    async uploadFile(file: File, subfolder: string, onProgress?: (percent: number) => void): Promise<string> {
        const send = () => new Promise<{ status: number; body: any }>((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('subfolder', subfolder);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${BASE_URL}/files/upload`);
            xhr.withCredentials = true; // session cookie
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => {
                let body: any = {};
                try { body = JSON.parse(xhr.responseText); } catch { /* empty or non-JSON body */ }
                resolve({ status: xhr.status, body });
            };
            xhr.onerror = () => reject(new Error('Network error while uploading the file'));
            xhr.send(formData);
        });

        let res = await send();
        if (res.status === 401 && isLoggedIn() && await this.refreshSession()) {
            res = await send(); // session renewed, retry once
        }
        if (res.status < 200 || res.status >= 300) {
            throw new Error(getApiErrorMessage(res.body, res.status === 413 ? 'The file is too large' : 'File upload failed'));
        }
        return res.body.fileUrl;
    },

    // ── Dashboard extras ──────────────────────────────────────────────

    async exportReport(format: 'json' | 'csv' = 'json'): Promise<any> {
        const response = await this.authFetch(`/dashboard/export?format=${format}`);
        if (!response.ok) throw new Error('Export failed');
        return await response.json();
    },

    /** "Forgot password": emails a reset code (same answer whether or not the account exists). */
    async forgotPassword(email: string): Promise<{ resetSessionId: string; message: string }> {
        const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(response.status === 429
                ? 'Too many requests. Please wait a few minutes before asking for a new code.'
                : getApiErrorMessage(data, 'Could not send the code'));
        }
        return data;
    },

    async resetPassword(resetSessionId: string, code: string, newPassword: string): Promise<{ message: string }> {
        const response = await fetch(`${BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resetSessionId, code, newPassword }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(response.status === 429
                ? 'Too many attempts. Please wait a few minutes.'
                : getApiErrorMessage(data, 'Invalid or expired code'));
        }
        return data;
    },

    /** "Notify me" on a coming-soon event. Guests give an email; logged-in users use their account email. */
    async notifyMeWhenOpen(eventId: string, email?: string): Promise<void> {
        const response = await fetch(`${BASE_URL}/events/${eventId}/notify-me`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(email ? { email } : {}),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(data, 'Could not save your request'));
        }
    },

    /** Event ids the logged-in user asked to be notified about. */
    async getMyEventSubscriptions(): Promise<string[]> {
        const response = await this.authFetch('/events/notify-me/mine');
        if (!response.ok) return [];
        return await response.json();
    },

    /** Public platform settings used by the register / event pages (no login needed). */
    async getPublicSettings(): Promise<{ allowPublicRegistrations: boolean; allowLateSubmissions: boolean }> {
        try {
            const response = await fetch(`${BASE_URL}/public/settings`);
            if (response.ok) return await response.json();
        } catch { /* fall back to defaults */ }
        return { allowPublicRegistrations: true, allowLateSubmissions: false };
    },

    /** Admin: sends a test email to the logged-in admin to check the SMTP settings. */
    async sendTestEmail(): Promise<{ message: string }> {
        const response = await this.authFetch('/admin/mail/test', { method: 'POST' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(getApiErrorMessage(data, 'Test email failed'));
        return data;
    },

    /** Admin "Data & Exports": downloads a CSV file (applications, jury-scores or events). */
    async downloadExport(kind: 'applications' | 'jury-scores' | 'events'): Promise<void> {
        const response = await this.authFetch(`/admin/exports/${kind}.csv`);
        if (!response.ok) throw new Error('Export failed. Please try again.');
        const disposition = response.headers.get('Content-Disposition') || '';
        const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] || `qaihub-${kind}.csv`;
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    /** Administrators (Settings page). */
    async getAdmins(): Promise<{ adminId: string; name: string; email: string; lastSignInAt: string | null; you: boolean }[]> {
        const response = await this.authFetch('/admin/admins');
        if (!response.ok) throw new Error('Could not load administrators');
        return await response.json();
    },

    async createAdmin(name: string, email: string): Promise<void> {
        const response = await this.authFetch('/admin/admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email }),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(data, 'Could not create the administrator'));
        }
    },

    async removeAdmin(adminId: string): Promise<void> {
        const response = await this.authFetch(`/admin/admins/${encodeURIComponent(adminId)}`, { method: 'DELETE' });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(data, 'Could not remove the administrator'));
        }
    },

    // ── Platform Settings ─────────────────────────────────────────────

    async updatePlatformSettings(settings: object): Promise<void> {
        const response = await this.authFetch('/admin/platform', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
        if (!response.ok) throw new Error('Failed to update platform settings');
    },

    /** Admin: invites a participant (founder / team member) to create an account. */
    async inviteParticipant(email: string, message?: string): Promise<void> {
        const response = await this.authFetch('/admin/invite-user', {
            method: 'POST',
            body: JSON.stringify({ email, message }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(err, 'Failed to send the invitation'));
        }
    },

    async inviteExpert(email: string, expertRole: string, eventId?: string, message?: string): Promise<void> {
        const response = await this.authFetch('/admin/invite-expert', {
            method: 'POST',
            body: JSON.stringify({ email, expertRole, eventId, message }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(err, 'Failed to send expert invitation'));
        }
    },

    // ── Account ────────────────────────────────────────────────────────

    async deleteAccount(): Promise<void> {
        const response = await this.authFetch('/users/me', {
            method: 'DELETE',
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(err, 'Failed to delete account'));
        }
    },

    // ── Event Stats ────────────────────────────────────────────────────

    async getEventStats(eventId: string): Promise<any> {
        const response = await this.authFetch(`/events/${eventId}/stats`);
        if (!response.ok) throw new Error('Failed to fetch event stats');
        return await response.json();
    },

    // ── Missing API Methods (to be implemented by backend) ─────────────────────────────────────────────

    async updateStartup(startupId: string, startupData: any): Promise<any> {
        const response = await this.authFetch(`/startups/${startupId}`, {
            method: 'PUT',
            body: JSON.stringify(startupData),
        });
        if (!response.ok) throw new Error('Failed to update startup');
        return await response.json();
    },

    async getTeammates(applicationId: string): Promise<any[]> {
        const response = await this.authFetch(`/applications/${applicationId}/teammates`);
        if (!response.ok) throw new Error('Failed to fetch teammates');
        return await response.json();
    },

    async getStartupRatings(applicationId: string): Promise<any[]> {
        const response = await this.authFetch(`/applications/${applicationId}/ratings`);
        if (!response.ok) throw new Error('Failed to fetch ratings');
        return await response.json();
    },

    async getPrograms(): Promise<any[]> {
        const response = await this.authFetch('/programs');
        if (!response.ok) throw new Error('Failed to fetch programs');
        return await response.json();
    },

    // Additional missing methods for backend endpoints
    async updateNotificationPreferences(preferences: any): Promise<void> {
        const response = await this.authFetch('/users/notif-prefs', {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(preferences),
        });
        if (!response.ok) throw new Error('Failed to update notification preferences');
    },
    // ── Team Invitations ────────────────────────────────────────────

    async inviteTeammate(startupId: string, email: string, role: string, personalMessage?: string, applicationId?: string): Promise<any> {
        const response = await this.authFetch('/team-invitations', {
            method: 'POST',
            body: JSON.stringify({ startupId, email, role, personalMessage, applicationId }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getApiErrorMessage(errorData, 'Failed to send invitation'));
        }
        return await response.json();
    },

    async getMyTeamInvitations(): Promise<any[]> {
        const response = await this.authFetch('/team-invitations/my');
        if (!response.ok) throw new Error('Failed to fetch invitations');
        return await response.json();
    },

    async respondToTeamInvitation(invitationId: string, accept: boolean): Promise<any> {
        const response = await this.authFetch(`/team-invitations/${invitationId}/respond`, {
            method: 'PUT',
            body: JSON.stringify({ accept }),
        });
        if (!response.ok) throw new Error('Failed to respond to invitation');
        return await response.json();
    },

    async getStartupInvitations(startupId: string): Promise<any[]> {
        const response = await this.authFetch(`/team-invitations/startup/${startupId}`);
        if (!response.ok) throw new Error('Failed to fetch startup invitations');
        return await response.json();
    },

    // ── Pitch Evaluations (Cumulative) ─────────────────────────────────────────

    /**
     * Fetches cumulative PitchEvaluation summaries for all applications in an event.
     * Endpoint: GET /api/evaluations/event/{eventId}
     */
    async getEvaluationSummaryByEvent(eventId: string): Promise<any[]> {
        const response = await this.authFetch(`/evaluations/event/${eventId}`);
        if (!response.ok) throw new Error('Failed to fetch evaluation summaries');
        return await response.json();
    },

    // ── Pitch Rounds CRUD ───────────────────────────────────────────────────────

    async deletePitchRound(roundId: number): Promise<void> {
        const response = await this.authFetch(`/pitch-rounds/${roundId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete round');
    },

    async updatePitchRoundCriteria(roundId: number, criteriaJson: string): Promise<any> {
        const response = await this.authFetch(`/pitch-rounds/${roundId}/criteria`, {
            method: 'PUT',
            body: JSON.stringify({ criteriaJson }),
        });
        if (!response.ok) throw new Error('Failed to update criteria');
        return await response.json();
    },

    async enhancePitchFeedback(payload: {
        roundName: string;
        scoresJson: string;
        feedback: string;
    }): Promise<{ enhancedFeedback: string }> {
        const response = await this.authFetch(`/pitch-rounds/enhance-feedback`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to enhance feedback');
        return await response.json();
    },

    async getPitchResultsByApplication(applicationId: string): Promise<any[]> {
        const response = await this.authFetch(`/pitch-rounds/application/${applicationId}/results`);
        if (!response.ok) throw new Error('Failed to fetch application pitch results');
        return await response.json();
    },

    async getEligiblePitchApplicants(phaseId: string): Promise<any[]> {
        const response = await this.authFetch(`/pitch-rounds/phase/${phaseId}/eligible-applicants`);
        if (!response.ok) throw new Error('Failed to fetch eligible applicants');
        return await response.json();
    },

};
