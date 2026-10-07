package tn.enicarthage.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Centralised email service.
 * All transactional emails (OTP, accept/reject, pitch results) go through here.
 * Methods are @Async so they never block the calling request thread.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${mail.from:}")
    private String configuredFrom;

    @Value("${mail.from.name:Q-AI Hub}")
    private String configuredFromName;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    // ── Helpers ────────────────────────────────────────────────────────────────

    @Async
    public void send(String to, String subject, String htmlBody) {
        try {
            mailSender.send(buildMessage(to, subject, htmlBody));
            log.info("Email sent to {} — subject: {}", to, subject);
        } catch (MessagingException | MailException e) {
            log.error("Failed to send email to {} — subject: {} — error: {}", to, subject, e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error while sending email to {} — subject: {} — error: {}", to, subject, e.getMessage(), e);
        }
    }

    private MimeMessage buildMessage(String to, String subject, String htmlBody) throws MessagingException {
        MimeMessage msg = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");

        // Many SMTP providers require a From address. Default to spring.mail.username when not configured.
        String from = (configuredFrom != null && !configuredFrom.isBlank()) ? configuredFrom : smtpUsername;
        if (from != null && !from.isBlank()) {
            try {
                helper.setFrom(from, configuredFromName);
            } catch (Exception ignored) {
                helper.setFrom(from);
            }
        }

        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        return msg;
    }

    /** HTML-escapes user-provided text before it is inserted into an email body. */
    private static String esc(String value) {
        return value == null ? null : org.springframework.web.util.HtmlUtils.htmlEscape(value);
    }

    private String wrap(String title, String accentColor, String bodyContent) {
        return "<!DOCTYPE html><html><body style=\"font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;\">" +
               "<div style=\"background:" + accentColor + ";padding:28px;text-align:center;border-radius:8px 8px 0 0;\">" +
               "<h1 style=\"color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px;\">" + title + "</h1></div>" +
               "<div style=\"padding:30px;background:#f9f9f9;border-radius:0 0 8px 8px;color:#222;line-height:1.55;\">" +
               bodyContent +
               "<hr style=\"margin-top:30px;border:none;border-top:1px solid #e5e7eb;\"/>" +
               "<p style=\"color:#999;font-size:11px;text-align:center;margin-top:14px;\">Q-AI Hub Platform · This is an automated message · Please do not reply.</p>" +
               "</div></body></html>";
    }

    // ── OTP / Verification email ──────────────────────────────────────────────

    /**
     * Synchronous OTP delivery: throws MailDeliveryException when the SMTP server rejects the
     * message, so the caller can tell the user the code was not sent.
     */
    public void sendOtpCodeNow(String to, String userName, String otpCode, int expiresMinutes) {
        userName = esc(userName);
        String html = buildOtpBody(userName, otpCode, expiresMinutes);
        try {
            mailSender.send(buildMessage(to, "Your Q-AI Hub verification code", html));
            log.info("OTP email sent to {}", to);
        } catch (MessagingException | MailException e) {
            log.error("Failed to send OTP email to {}: {}", to, e.getMessage(), e);
            throw new tn.enicarthage.backend.exception.MailDeliveryException(
                    "We could not send the verification code to " + to + ". Please try again later.");
        }
    }

    /**
     * Synchronous test message used by the admin "Send test email" button. Throws a
     * MailDeliveryException with a hint about the usual SMTP setup mistakes.
     */
    public void sendTestEmailNow(String to) {
        String html = wrap("Email is working", "#16a34a",
            "<p>This test message confirms that Q-AI Hub can send emails.</p>" +
            "<p>Verification codes, invitations and results will be delivered from this address.</p>");
        try {
            mailSender.send(buildMessage(to, "Q-AI Hub test email", html));
            log.info("Test email sent to {}", to);
        } catch (MessagingException | MailException e) {
            log.error("Test email to {} failed: {}", to, e.getMessage(), e);
            String detail = String.valueOf(e.getMessage()).toLowerCase();
            String hint;
            if (detail.contains("authentication") || detail.contains("535") || detail.contains("username and password")) {
                hint = "The SMTP server rejected the login. For Gmail, MAIL_PASSWORD must be a 16-character App Password "
                        + "(not your normal password) and MAIL_USERNAME your full Gmail address.";
            } else if (detail.contains("connect") || detail.contains("timed out") || detail.contains("unknownhost")) {
                hint = "Could not reach the SMTP server. Check MAIL_HOST / MAIL_PORT (Gmail: smtp.gmail.com / 587) "
                        + "and that your network allows outgoing SMTP.";
            } else if (detail.contains("sender") || detail.contains("from")) {
                hint = "The sender address was refused. MAIL_FROM must be the same as MAIL_USERNAME (or a verified alias).";
            } else {
                hint = "Check MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD and MAIL_FROM in backend/.env.";
            }
            throw new tn.enicarthage.backend.exception.MailDeliveryException("Test email failed. " + hint);
        }
    }

    @Async
    public void sendOtpCode(String to, String userName, String otpCode, int expiresMinutes) {
        userName = esc(userName);
        send(to, "Your Q-AI Hub verification code", buildOtpBody(userName, otpCode, expiresMinutes));
    }

    private String buildOtpBody(String userName, String otpCode, int expiresMinutes) {
        String safeName = (userName == null || userName.isBlank()) ? "there" : userName;
        String body =
            "<p>Hello <strong>" + safeName + "</strong>,</p>" +
            "<p>Use the code below to finish signing in to your Q-AI Hub account.</p>" +
            "<div style=\"background:#1a1a2e;color:#00ff88;font-size:34px;font-weight:bold;" +
            "text-align:center;padding:18px;border-radius:8px;letter-spacing:10px;margin:22px 0;\">" +
            otpCode + "</div>" +
            "<p style=\"color:#555;\">This code expires in <strong>" + expiresMinutes + " minutes</strong>.</p>" +
            "<p style=\"color:#555;\">If you did not request this code, please ignore this email — " +
            "someone may be trying to access your account. Consider changing your password if you suspect a breach.</p>" +
            "<p style=\"color:#999;font-size:12px;margin-top:18px;\">Never share this code with anyone. " +
            "Q-AI Hub will never ask for your verification code.</p>";
        return wrap("Security Verification", "#1a1a2e", body);
    }

    // ── New administrator ─────────────────────────────────────────────────────

    @Async
    public void sendAdminAccountCreated(String to, String name, String createdBy, String setPasswordLink) {
        String safeName = (name == null || name.isBlank()) ? "there" : esc(name);
        String by = (createdBy == null || createdBy.isBlank()) ? "An administrator" : esc(createdBy);
        String body =
            "<p>Hello <strong>" + safeName + "</strong>,</p>" +
            "<p>" + by + " made you an <strong>administrator of Q-AI Hub</strong>.</p>" +
            "<p>To activate your account, choose your password: open the link below, enter this email address, " +
            "and type the code you will receive.</p>" +
            button(setPasswordLink, "Choose my password", "#1e3a8a") +
            "<p style=\"color:#777;font-size:12px;margin-top:18px;\">For security, no password is ever sent by email. " +
            "If you were not expecting this, you can ignore this message.</p>";
        send(to, "You are now a Q-AI Hub administrator", wrap("Administrator Access", "#1e3a8a", body));
    }

    // ── "Notify me": the event is now open ───────────────────────────────────

    @Async
    public void sendEventOpened(String to, tn.enicarthage.backend.entity.Event event, String link) {
        String title = esc(event.getTitle());
        String date = event.getStartDate() != null ? event.getStartDate().toString() : "to be announced";
        String deadline = event.getApplicationDeadline() != null
            ? "<p>Registrations close on <strong>" + event.getApplicationDeadline() + "</strong>.</p>" : "";
        String body =
            "<p>Hello,</p>" +
            "<p>Good news: <strong>" + title + "</strong> is now open on Q-AI Hub (event date: " + date + ").</p>" +
            deadline +
            button(link, "Register now", "#0061FF") +
            "<p style=\"color:#777;font-size:12px;margin-top:18px;\">You receive this email because you asked to be notified " +
            "when this event opens. You will not receive other emails about it.</p>";
        send(to, title + " is now open – Q-AI Hub", wrap("Event Open", "#0061FF", body));
    }

    // ── Password reset ────────────────────────────────────────────────────────

    /** Synchronous, like the login code: the request fails if the code cannot be delivered. */
    public void sendPasswordResetCodeNow(String to, String userName, String code, int expiresMinutes) {
        String safeName = (userName == null || userName.isBlank()) ? "there" : esc(userName);
        String body =
            "<p>Hello <strong>" + safeName + "</strong>,</p>" +
            "<p>We received a request to reset the password of your Q-AI Hub account. Enter this code to choose a new password:</p>" +
            "<div style=\"background:#1a1a2e;color:#00ff88;font-size:34px;font-weight:bold;" +
            "text-align:center;padding:18px;border-radius:8px;letter-spacing:10px;margin:22px 0;\">" +
            code + "</div>" +
            "<p style=\"color:#555;\">This code expires in <strong>" + expiresMinutes + " minutes</strong>.</p>" +
            "<p style=\"color:#555;\">If you did not ask to reset your password, ignore this email: " +
            "your current password stays unchanged.</p>";
        try {
            mailSender.send(buildMessage(to, "Reset your Q-AI Hub password", wrap("Password Reset", "#1a1a2e", body)));
            log.info("Password reset code sent to {}", to);
        } catch (MessagingException | MailException e) {
            log.error("Failed to send password reset code to {}: {}", to, e.getMessage(), e);
            throw new tn.enicarthage.backend.exception.MailDeliveryException(
                    "We could not send the reset code to " + to + ". Please try again later.");
        }
    }

    /** Security notice after a password change, so the owner notices if it was not them. */
    @Async
    public void sendPasswordChangedNotice(String to, String userName) {
        String safeName = (userName == null || userName.isBlank()) ? "there" : esc(userName);
        String body =
            "<p>Hello <strong>" + safeName + "</strong>,</p>" +
            "<p>The password of your Q-AI Hub account was just changed, and all your sessions were signed out.</p>" +
            "<p>If this was you, there is nothing else to do.</p>" +
            "<p><strong>If it was not you</strong>, use \"Forgot password?\" on the login page right away " +
            "and contact the Q-AI Hub team.</p>";
        send(to, "Your Q-AI Hub password was changed", wrap("Password Changed", "#16a34a", body));
    }

    // ── Expert invitation email ───────────────────────────────────────────────

    @Async
    public void sendExpertInvitation(String to, String expertRole, String eventTitle, String registrationLink) {
        sendExpertInvitation(to, expertRole, eventTitle, registrationLink, null);
    }

    @Async
    public void sendExpertInvitation(String to, String expertRole, String eventTitle, String registrationLink, String personalMessage) {
        expertRole = esc(expertRole);
        eventTitle = esc(eventTitle);
        String note = personalNote(personalMessage);
        String safeRole = expertRole == null ? "expert" : expertRole;
        String safeEvent = (eventTitle == null || eventTitle.isBlank()) ? "an upcoming event" : eventTitle;
        String body =
            "<p>Hello,</p>" +
            "<p>You have been invited to join <strong>Q-AI Hub</strong> as a " +
            "<strong>" + safeRole + "</strong> for <strong>" + safeEvent + "</strong>.</p>" + note +
            "<p>Use the secure link below: log in if you already have a Q-AI Hub account, " +
            "otherwise complete your registration. Please use the same email address this invitation was sent to. " +
            "You will then find the event under <strong>Expert Roles</strong> in your dashboard, " +
            "where you can review the startups and score their pitches.</p>" +
            button(registrationLink, "Accept Invitation", "#7B2FFF") +
            "<p style=\"color:#777;font-size:12px;margin-top:18px;\">This invitation is personal and tied to your email. " +
            "If you were not expecting it, you can safely ignore this message.</p>";
        send(to, "You're invited to Q-AI Hub as " + safeRole, wrap("Expert Invitation", "#7B2FFF", body));
    }

    /** Invitation for a participant (founder / team member) to create an account. */
    @Async
    public void sendParticipantInvitation(String to, String registrationLink, String personalMessage) {
        String body =
            "<p>Hello,</p>" +
            "<p>You have been invited to join <strong>Q-AI Hub</strong>, the Quantum-AI incubator of ENICarthage: " +
            "events, incubation programs and pitch competitions for startups.</p>" + personalNote(personalMessage) +
            "<p>Create your account with the secure link below, using this email address.</p>" +
            button(registrationLink, "Create my account", "#0061FF") +
            "<p style=\"color:#777;font-size:12px;margin-top:18px;\">This invitation is personal and can be used once. " +
            "If you were not expecting it, you can safely ignore this message.</p>";
        send(to, "You're invited to join Q-AI Hub", wrap("Invitation", "#0061FF", body));
    }

    private static String personalNote(String message) {
        if (message == null || message.isBlank()) return "";
        return "<blockquote style=\"border-left:4px solid #ddd;margin:16px 0;padding:8px 14px;color:#444;\">" +
               esc(message.trim()).replace("\n", "<br/>") + "</blockquote>";
    }

    private static String button(String link, String label, String color) {
        return "<div style=\"text-align:center;margin:26px 0;\">" +
               "<a href=\"" + link + "\" style=\"display:inline-block;background:" + color + ";color:#ffffff;text-decoration:none;" +
               "padding:14px 28px;border-radius:8px;font-weight:bold;font-size:14px;\">" + label + "</a></div>" +
               "<p style=\"color:#555;font-size:12px;\">If the button does not work, copy this link into your browser:<br/>" +
               "<a href=\"" + link + "\" style=\"word-break:break-all;\">" + link + "</a></p>";
    }


    // ── Teammate invitation email ─────────────────────────────────────────────

    @Async
    public void sendTeammateInvitation(String to, String startupName, String role, String personalMessage) {
        startupName = esc(startupName);
        role = esc(role);
        personalMessage = esc(personalMessage);
        String safeStartup = (startupName == null || startupName.isBlank()) ? "a startup" : startupName;
        String safeRole = (role == null || role.isBlank()) ? "teammate" : role;
        String messageBlock = (personalMessage != null && !personalMessage.isBlank())
            ? "<div style=\"background:#ffffff;border-left:4px solid #0061FF;padding:14px 18px;margin:18px 0;border-radius:4px;\">" +
              "<p style=\"margin:0;color:#444;\"><em>\"" + personalMessage + "\"</em></p>" +
              "<p style=\"margin:8px 0 0;color:#888;font-size:12px;\">— message from the founder</p></div>"
            : "";
        String body =
            "<p>Hello,</p>" +
            "<p>You have been invited to join <strong>" + safeStartup + "</strong> as <strong>" + safeRole + "</strong> on Q-AI Hub.</p>" +
            messageBlock +
            "<p>Log in to your Q-AI Hub account and open your <strong>Invitations</strong> page to accept or decline this invite. " +
            "If you don't have an account yet, you can register with this same email address and the invite will appear automatically.</p>" +
            "<div style=\"text-align:center;margin:26px 0;\">" +
            "<a href=\"http://localhost:5173/invitations\" " +
            "style=\"display:inline-block;background:#0061FF;color:#ffffff;text-decoration:none;" +
            "padding:14px 28px;border-radius:8px;font-weight:bold;font-size:14px;\">View invitation</a>" +
            "</div>" +
            "<p style=\"color:#777;font-size:12px;\">If you weren't expecting this invitation, you can safely ignore it.</p>";
        send(to, "You've been invited to join " + safeStartup + " on Q-AI Hub",
             wrap("Team Invitation", "#0061FF", body));
    }

    // ── Application emails ─────────────────────────────────────────────────────

    @Async
    public void sendApplicationAccepted(String to, String startupName, String trackingCode) {
        startupName = esc(startupName);
        String body =
            "<p>Dear <strong>" + startupName + "</strong>,</p>" +
            "<p>Congratulations! Your application has been <strong style=\"color:#22c55e;\">accepted</strong>.</p>" +
            "<p>You are now an accepted participant of the event. " +
            "We will notify you as soon as <strong>Phase 1</strong> opens so you can submit your answers.</p>" +
            "<div style=\"background:#1a1a2e;color:#00ff88;font-size:20px;font-weight:bold;" +
            "text-align:center;padding:16px;border-radius:8px;letter-spacing:4px;margin:20px 0;\">" +
            trackingCode + "</div>" +
            "<p>Use this tracking code at any time to check the status of your application, even without logging in.</p>" +
            "<p>Good luck! The Q-AI Hub team is rooting for you.</p>";
        send(to, "Application Accepted – Q-AI Hub", wrap("Application Accepted", "#16a34a", body));
    }

    @Async
    public void sendApplicationRejected(String to, String startupName, String reason) {
        startupName = esc(startupName);
        reason = esc(reason);
        String reasonSection = (reason != null && !reason.isBlank())
            ? "<p><em>Feedback from our team: " + reason + "</em></p>"
            : "";
        String body =
            "<p>Dear <strong>" + startupName + "</strong>,</p>" +
            "<p>Thank you for taking the time to apply to Q-AI Hub. After careful review, " +
            "we regret to inform you that your application has <strong style=\"color:#dc2626;\">not been selected</strong> " +
            "for this cycle.</p>" +
            reasonSection +
            "<p>This decision is not a reflection of your potential. We encourage you to continue building and apply again " +
            "in our next cycle — many successful startups were accepted on their second attempt.</p>" +
            "<p>With respect and encouragement,<br/>The Q-AI Hub Team</p>";
        send(to, "Your Q-AI Hub Application", wrap("Application Update", "#dc2626", body));
    }

    // ── Pitch round emails ─────────────────────────────────────────────────────

    @Async
    public void sendPitchRoundResult(String to, String startupName, String roundName,
                                     Double score, String decision, String feedback, String aiFeedback) {
        startupName = esc(startupName);
        roundName = esc(roundName);
        aiFeedback = esc(aiFeedback);
        boolean passed = "PASSED".equalsIgnoreCase(decision);
        String color = passed ? "#16a34a" : "#dc2626";
        String headline = passed ? "You passed " + roundName + "!" : "Thank you for pitching in " + roundName;

        String body =
            "<p>Dear <strong>" + startupName + "</strong>,</p>" +
            "<p>" + headline + "</p>" +
            "<table style=\"width:100%;border-collapse:collapse;margin:20px 0;\">" +
            "<tr><td style=\"padding:8px;background:#f3f4f6;\"><strong>Round</strong></td>" +
            "    <td style=\"padding:8px;\">" + roundName + "</td></tr>" +
            "<tr><td style=\"padding:8px;background:#f3f4f6;\"><strong>Score</strong></td>" +
            "    <td style=\"padding:8px;font-weight:bold;color:" + color + ";\">" + score + " pts</td></tr>" +
            "<tr><td style=\"padding:8px;background:#f3f4f6;\"><strong>Decision</strong></td>" +
            "    <td style=\"padding:8px;font-weight:bold;color:" + color + ";\">" + decision + "</td></tr>" +
            "</table>" +
            "<p><strong>Feedback:</strong></p>" +
            "<blockquote style=\"border-left:4px solid " + color + ";padding:10px 16px;background:#f9fafb;margin:0;\">" +
            feedback + "</blockquote>" +
            (passed
                ? "<p style=\"margin-top:20px;\">Stay focused — the next stage awaits. We believe in you!</p>"
                : "<p style=\"margin-top:20px;\">Your effort and courage to present are commendable. " +
                  "Keep building — every pitch is a learning experience.</p>") +
            "<p>The Q-AI Hub Jury</p>";

        String subject = passed
            ? "You passed " + roundName + " – Q-AI Hub"
            : "Your results from " + roundName + " – Q-AI Hub";
        send(to, subject, wrap("Pitch Results", color, body));
    }
    // ── Simple event registration ─────────────────────────────────────────────

    @Async
    public void sendEventRegistrationConfirmation(String to, String participantName,
                                                  tn.enicarthage.backend.entity.Event event) {
        String esc = org.springframework.web.util.HtmlUtils.htmlEscape(participantName);
        String title = org.springframework.web.util.HtmlUtils.htmlEscape(event.getTitle());
        String date = event.getStartDate() != null ? event.getStartDate().toString() : "To be announced";
        String location = event.getLocation() != null && !event.getLocation().isBlank()
            ? org.springframework.web.util.HtmlUtils.htmlEscape(event.getLocation()) : "Online";
        String body =
            "<p>Hello <strong>" + esc + "</strong>,</p>" +
            "<p>Your registration for <strong>" + title + "</strong> is confirmed.</p>" +
            "<table style=\"width:100%;border-collapse:collapse;margin:20px 0;\">" +
            "<tr><td style=\"padding:8px;background:#f3f4f6;\"><strong>Date</strong></td>" +
            "    <td style=\"padding:8px;\">" + date + "</td></tr>" +
            "<tr><td style=\"padding:8px;background:#f3f4f6;\"><strong>Location</strong></td>" +
            "    <td style=\"padding:8px;\">" + location + "</td></tr>" +
            "</table>" +
            "<p>See you there!<br/>The Q-AI Hub Team</p>";
        send(to, "Registration confirmed: " + event.getTitle(), wrap("You're Registered", "#0061FF", body));
    }

    @Async
    public void sendPhaseDecision(String to, String startupName, String phaseName, String decision, String feedback) {
        startupName = esc(startupName);
        phaseName = esc(phaseName);
        feedback = esc(feedback);
        boolean accepted = "ACCEPTED".equalsIgnoreCase(decision);
        String color = accepted ? "#16a34a" : "#dc2626";
        String statusLabel = accepted ? "ACCEPTED" : "NOT SELECTED";
        
        String body = 
            "<p>Dear <strong>" + startupName + "</strong>,</p>" +
            "<p>We have completed the review of your submission for <strong>" + phaseName + "</strong>.</p>" +
            "<div style=\"margin:20px 0;padding:15px;background:#f3f4f6;border-left:4px solid " + color + ";\">" +
            "  <p style=\"margin:0;font-size:18px;\">Status: <strong style=\"color:" + color + ";\">" + statusLabel + "</strong></p>" +
            "</div>" +
            (feedback != null && !feedback.isBlank() 
                ? "<p><strong>Evaluator Feedback:</strong></p><blockquote style=\"background:#f9fafb;padding:10px;border:1px solid #eee;\">" + feedback + "</blockquote>"
                : "") +
            (accepted 
                ? "<p>Congratulations! You have successfully passed this stage. Keep an eye on your dashboard for the next steps.</p>"
                : "<p>Thank you for your effort. While we won't be moving forward with your application at this time, we appreciate your interest in the programme.</p>") +
            "<p>Best regards,<br/>The Q-AI Hub Team</p>";

        send(to, "Update regarding " + phaseName, wrap("Phase Decision", color, body));
    }
}
