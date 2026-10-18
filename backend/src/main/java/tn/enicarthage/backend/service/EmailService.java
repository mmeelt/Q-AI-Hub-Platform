package tn.enicarthage.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Centralised email service.
 * All transactional emails (OTP, accept/reject, pitch results) go through here.
 * Methods are @Async so they never block the calling request thread.
 *
 * Every email uses the same layout (see wrap): logo on a light background, a white card
 * with the message, then a footer. Colours come from the web app's palette.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    // Q-AI Hub palette (frontend/src/styles/theme.css)
    private static final String NAVY = "#1e3a8a";       // --primary
    private static final String INK = "#0f172a";        // --foreground
    private static final String TEXT = "#334155";
    private static final String MUTED = "#64748b";
    private static final String PAGE_BG = "#f1f5f9";    // --background
    private static final String SOFT_BG = "#f8fafc";
    private static final String BORDER = "#e2e8f0";     // --secondary
    private static final String SUCCESS = "#3FA37C";    // --mint-green
    private static final String DANGER = "#C8545E";     // --danger
    private static final String PURPLE = "#7559B8";     // --accent-purple
    private static final String FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

    private static final String LOGO_CID = "qaihub-logo";
    private static final ClassPathResource LOGO = new ClassPathResource("email/logo.png");

    private final JavaMailSender mailSender;

    @Value("${mail.from:}")
    private String configuredFrom;

    @Value("${mail.from.name:Q-AI Hub}")
    private String configuredFromName;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

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
        return buildMessage(to, subject, null, htmlBody);
    }

    /** plainText (optional) is sent as a text/plain alternative: HTML-only mails are more often spam-filtered or delayed. */
    private MimeMessage buildMessage(String to, String subject, String plainText, String htmlBody) throws MessagingException {
        MimeMessage msg = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");

        String from = senderAddress();
        if (from != null && !from.isBlank()) {
            try {
                helper.setFrom(from, configuredFromName);
            } catch (Exception ignored) {
                helper.setFrom(from);
            }
        }

        helper.setTo(to);
        helper.setSubject(subject);
        if (plainText != null) {
            helper.setText(plainText, htmlBody);
        } else {
            helper.setText(htmlBody, true);
        }
        // The logo travels inside the email (no external image to block or load)
        if (LOGO.exists()) {
            helper.addInline(LOGO_CID, LOGO, "image/png");
        }
        // Unique per message: Gmail never merges or collapses it into an earlier email
        // (each new code arrives as a new, fully visible email)
        msg.setHeader("X-Entity-Ref-ID", UUID.randomUUID().toString());
        return msg;
    }

    // Many SMTP providers require a From address. Default to spring.mail.username when not configured.
    private String senderAddress() {
        return (configuredFrom != null && !configuredFrom.isBlank()) ? configuredFrom : smtpUsername;
    }

    /** HTML-escapes user-provided text before it is inserted into an email body. */
    private static String esc(String value) {
        return value == null ? null : org.springframework.web.util.HtmlUtils.htmlEscape(value);
    }

    private String wrap(String title, String accentColor, String bodyContent) {
        return wrap(title, accentColor, bodyContent, null);
    }

    /**
     * Shared layout: logo, white card (coloured top border + small title), footer.
     * preheader = the grey preview line shown next to the subject in the inbox.
     */
    private String wrap(String title, String accentColor, String bodyContent, String preheader) {
        String contact = senderAddress();
        String contactLink = (contact == null || contact.isBlank()) ? ""
            : " &nbsp;&middot;&nbsp; <a href=\"mailto:" + contact + "\" style=\"color:" + NAVY + ";text-decoration:underline;\">Contact us</a>";
        String hiddenPreheader = (preheader == null) ? ""
            : "<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;\">" + preheader + "</div>";
        return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\">" +
               "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
               "<meta name=\"color-scheme\" content=\"light\"><title>" + title + "</title></head>" +
               "<body style=\"margin:0;padding:0;background:" + PAGE_BG + ";\">" + hiddenPreheader +
               "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:" + PAGE_BG + ";\">" +
               "<tr><td align=\"center\" style=\"padding:40px 16px;\">" +
               "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:560px;\">" +

               // Logo
               "<tr><td align=\"center\" style=\"padding:0 0 24px;\">" +
               "<img src=\"cid:" + LOGO_CID + "\" width=\"31\" height=\"56\" alt=\"Q-AI Hub\" style=\"display:block;border:0;outline:none;\">" +
               "<div style=\"font-family:" + FONT + ";font-size:17px;font-weight:700;color:" + INK + ";margin-top:10px;letter-spacing:0.3px;\">Q-AI Hub</div>" +
               "</td></tr>" +

               // Card
               "<tr><td style=\"background:#ffffff;border:1px solid " + BORDER + ";border-top:4px solid " + accentColor + ";" +
               "border-radius:12px;padding:36px 36px 32px;font-family:" + FONT + ";font-size:15px;line-height:1.65;color:" + TEXT + ";\">" +
               "<p style=\"margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:" + accentColor + ";\">" + title + "</p>" +
               bodyContent +
               "</td></tr>" +

               // Footer
               "<tr><td align=\"center\" style=\"padding:28px 16px 0;font-family:" + FONT + ";font-size:12px;line-height:1.8;color:" + MUTED + ";\">" +
               "&copy; " + Year.now().getValue() + " Q-AI Hub &middot; Quantum-AI Incubator, ENICarthage, Tunisia<br>" +
               "<a href=\"" + frontendUrl + "\" style=\"color:" + NAVY + ";text-decoration:underline;\">Visit Q-AI Hub</a>" + contactLink + "<br>" +
               "<span style=\"color:#94a3b8;\">This is an automated message, please do not reply.</span>" +
               "</td></tr>" +

               "</table></td></tr></table></body></html>";
    }

    /** Big "Hi Name," line at the top of the card. */
    private static String greeting(String text) {
        return "<h1 style=\"margin:0 0 18px;font-size:24px;line-height:1.3;font-weight:700;color:" + INK + ";\">" + text + "</h1>";
    }

    private static String hi(String escapedName) {
        return greeting("Hi " + ((escapedName == null || escapedName.isBlank()) ? "there" : escapedName) + ",");
    }

    private static String paragraph(String html) {
        return "<p style=\"margin:0 0 16px;\">" + html + "</p>";
    }

    private static String note(String html) {
        return "<p style=\"margin:0 0 12px;font-size:13px;color:" + MUTED + ";\">" + html + "</p>";
    }

    private static String signOff(String team) {
        return "<p style=\"margin:24px 0 0;\">Thank you,<br><strong style=\"color:" + INK + ";\">" + team + "</strong></p>";
    }

    /** "If it was not you, contact us at ..." line, like the reference design. */
    private String securityNote(String whatHappened) {
        String contact = senderAddress();
        String reach = (contact == null || contact.isBlank()) ? "contact the Q-AI Hub team."
            : "contact us immediately at <a href=\"mailto:" + contact + "\" style=\"color:" + NAVY + ";\">" + contact + "</a>.";
        return note("If you did not " + whatHappened + ", you can ignore this email or " + reach);
    }

    /**
     * The key information of each email (role, event, score, decision) in a coloured block,
     * so every email has the same structure as the verification-code email.
     */
    private static String highlight(String label, String value, String caption, String color) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:24px 0;\">" +
               "<tr><td align=\"center\" style=\"background:" + color + ";border-radius:10px;padding:20px 24px;\">" +
               "<div style=\"font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,0.75);\">" + label + "</div>" +
               "<div style=\"margin-top:6px;font-size:22px;line-height:1.35;font-weight:700;color:#ffffff;\">" + value + "</div>" +
               (caption == null ? "" : "<div style=\"margin-top:6px;font-size:13px;color:rgba(255,255,255,0.85);\">" + caption + "</div>") +
               "</td></tr></table>";
    }

    /** Time of sending, added to code-email subjects so each new code arrives as a new email (not grouped with the old one). */
    private static String sentAt() {
        return LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
    }

    /** The 6-digit code, in a navy block that stands out like the reference's button. */
    private static String codeBox(String code, String caption) {
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" align=\"center\" style=\"margin:28px auto 8px;\">" +
               "<tr><td align=\"center\" style=\"background:" + NAVY + ";border-radius:10px;padding:16px 20px 16px 30px;" + // right side shorter: letter-spacing adds space after the last digit
               "font-family:'Courier New',Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#ffffff;\">" +
               code + "</td></tr></table>" +
               "<p style=\"margin:0 0 24px;text-align:center;font-size:13px;color:" + MUTED + ";\">" + caption + "</p>";
    }

    /** Key/value table (round results, event details). */
    private static String detailsTable(String... rows) {
        StringBuilder sb = new StringBuilder("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" " +
                "style=\"margin:8px 0 20px;border:1px solid " + BORDER + ";border-radius:8px;border-collapse:separate;overflow:hidden;\">");
        for (int i = 0; i + 1 < rows.length; i += 2) {
            String top = i == 0 ? "" : "border-top:1px solid " + BORDER + ";";
            sb.append("<tr><td style=\"padding:10px 14px;background:").append(SOFT_BG).append(";width:38%;font-size:13px;color:")
              .append(MUTED).append(";").append(top).append("\">").append(rows[i]).append("</td>")
              .append("<td style=\"padding:10px 14px;font-size:14px;color:").append(INK).append(";").append(top).append("\">")
              .append(rows[i + 1]).append("</td></tr>");
        }
        return sb.append("</table>").toString();
    }

    private static String quote(String html, String color) {
        return "<div style=\"margin:0 0 20px;padding:12px 16px;background:" + SOFT_BG + ";border-left:4px solid " + color + ";" +
               "border-radius:4px;color:" + TEXT + ";\">" + html + "</div>";
    }

    // ── OTP / Verification email ──────────────────────────────────────────────

    /**
     * Synchronous OTP delivery: throws MailDeliveryException when the SMTP server rejects the
     * message, so the caller can tell the user the code was not sent.
     */
    public void sendOtpCodeNow(String to, String userName, String otpCode, int expiresMinutes) {
        String text = codePlainText(userName, "Your Q-AI Hub verification code is: ", otpCode, expiresMinutes);
        String html = buildOtpBody(esc(userName), otpCode, expiresMinutes);
        try {
            // The code is NOT in the subject (only in the body). The time makes every subject distinct,
            // so Gmail shows each new code as a new email instead of stacking it under the old one.
            mailSender.send(buildMessage(to, "Your Q-AI Hub verification code (" + sentAt() + ")", text, html));
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
        String html = wrap("Email is working", SUCCESS,
            greeting("Hello,") +
            paragraph("This test message confirms that Q-AI Hub can send emails.") +
            paragraph("Verification codes, invitations and results will be delivered from this address.") +
            signOff("The Q-AI Hub Team"));
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
        send(to, "Your Q-AI Hub verification code (" + sentAt() + ")", buildOtpBody(userName, otpCode, expiresMinutes));
    }

    private static String minutes(int n) {
        return n + (n == 1 ? " minute" : " minutes");
    }

    private static String codePlainText(String userName, String intro, String code, int expiresMinutes) {
        String safeName = (userName == null || userName.isBlank()) ? "there" : userName;
        return "Hi " + safeName + ",\n\n" + intro + code + "\n\n"
                + "This code expires in " + minutes(expiresMinutes) + " and replaces any code sent before.\n"
                + "If you did not request it, ignore this email. Never share this code with anyone.\n\n"
                + "Thank you,\nThe Q-AI Hub Team";
    }

    private String buildOtpBody(String userName, String otpCode, int expiresMinutes) {
        String body =
            hi(userName) +
            paragraph("Here is your verification code. Enter it on the Q-AI Hub page to finish signing in.") +
            codeBox(otpCode, "Expires in " + minutes(expiresMinutes) + " &middot; replaces any code sent before") +
            note("Never share this code with anyone. Q-AI Hub will never ask you for it.") +
            securityNote("try to sign in") +
            signOff("The Q-AI Hub Team");
        return wrap("Security verification", NAVY, body, "Use this code within " + minutes(expiresMinutes) + " to sign in to Q-AI Hub.");
    }

    // ── New administrator ─────────────────────────────────────────────────────

    @Async
    public void sendAdminAccountCreated(String to, String name, String createdBy, String setPasswordLink) {
        String by = (createdBy == null || createdBy.isBlank()) ? "An administrator" : esc(createdBy);
        String body =
            hi(esc(name)) +
            paragraph(by + " made you an <strong>administrator of Q-AI Hub</strong>.") +
            highlight("Your new role", "Administrator", "Full access to events, rounds and evaluations", NAVY) +
            paragraph("To activate your account, choose your password: open the link below, enter this email address, " +
                      "and type the code you will receive.") +
            button(setPasswordLink, "Choose my password", NAVY) +
            note("For security, no password is ever sent by email. If you were not expecting this, you can ignore this message.") +
            signOff("The Q-AI Hub Team");
        send(to, "You are now a Q-AI Hub administrator", wrap("Administrator access", NAVY, body));
    }

    // ── "Notify me": the event is now open ───────────────────────────────────

    @Async
    public void sendEventOpened(String to, tn.enicarthage.backend.entity.Event event, String link) {
        String title = esc(event.getTitle());
        String date = event.getStartDate() != null ? event.getStartDate().toString() : "To be announced";
        String body =
            greeting("Good news!") +
            paragraph("An event you follow is now open for registration on Q-AI Hub.") +
            highlight("Now open", title, null, NAVY) +
            detailsTable("Event date", date,
                         "Registrations close", event.getApplicationDeadline() != null ? event.getApplicationDeadline().toString() : "Not set") +
            button(link, "Register now", NAVY) +
            note("You receive this email because you asked to be notified when this event opens. " +
                 "You will not receive other emails about it.") +
            signOff("The Q-AI Hub Team");
        send(to, title + " is now open – Q-AI Hub", wrap("Event open", NAVY, body));
    }

    // ── Password reset ────────────────────────────────────────────────────────

    /** Synchronous, like the login code: the request fails if the code cannot be delivered. */
    public void sendPasswordResetCodeNow(String to, String userName, String code, int expiresMinutes) {
        String body =
            hi(esc(userName)) +
            paragraph("Need to reset your password? No problem. Enter the code below on the Q-AI Hub page " +
                      "and you will be able to choose a new password.") +
            codeBox(code, "Expires in " + minutes(expiresMinutes) + " &middot; replaces any code sent before") +
            note("Your current password stays unchanged until you choose a new one.") +
            securityNote("ask to reset your password") +
            signOff("The Q-AI Hub Team");
        try {
            String text = codePlainText(userName, "Your Q-AI Hub password reset code is: ", code, expiresMinutes);
            mailSender.send(buildMessage(to, "Reset your Q-AI Hub password (" + sentAt() + ")", text,
                    wrap("Password reset", NAVY, body, "Use this code within " + minutes(expiresMinutes) + " to choose a new password.")));
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
        String body =
            hi(esc(userName)) +
            paragraph("The password of your Q-AI Hub account was just changed, and all your sessions were signed out.") +
            highlight("Security update", "Password changed", "Today at " + sentAt(), SUCCESS) +
            paragraph("If this was you, there is nothing else to do.") +
            paragraph("<strong>If it was not you</strong>, use \"Forgot password?\" on the login page right away.") +
            button(frontendUrl + "/forgot-password", "Reset my password", NAVY) +
            securityNote("change your password") +
            signOff("The Q-AI Hub Team");
        send(to, "Your Q-AI Hub password was changed", wrap("Password changed", SUCCESS, body));
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
        String safeRole = expertRole == null ? "expert" : expertRole;
        String safeEvent = (eventTitle == null || eventTitle.isBlank()) ? "an upcoming event" : eventTitle;
        String body =
            greeting("Hello,") +
            paragraph("You have been invited to join <strong>Q-AI Hub</strong> as a <strong>" + safeRole +
                      "</strong> for <strong>" + safeEvent + "</strong>.") +
            highlight("Your role", safeRole, safeEvent, PURPLE) +
            personalNote(personalMessage) +
            paragraph("Use the secure link below: log in if you already have a Q-AI Hub account, " +
                      "otherwise complete your registration. Please use the same email address this invitation was sent to. " +
                      "You will then find the event under <strong>Expert Roles</strong> in your dashboard, " +
                      "where you can review the startups and score their pitches.") +
            button(registrationLink, "Accept invitation", PURPLE) +
            note("This invitation is personal and tied to your email. If you were not expecting it, you can safely ignore this message.") +
            signOff("The Q-AI Hub Team");
        send(to, "You're invited to Q-AI Hub as " + safeRole, wrap("Expert invitation", PURPLE, body));
    }

    /** Invitation for a participant (founder / team member) to create an account. */
    @Async
    public void sendParticipantInvitation(String to, String registrationLink, String personalMessage) {
        String body =
            greeting("Hello,") +
            paragraph("You have been invited to join <strong>Q-AI Hub</strong>, the Quantum-AI incubator of ENICarthage: " +
                      "events, incubation programs and pitch competitions for startups.") +
            highlight("You're invited", "Join Q-AI Hub", "Events &middot; Incubation &middot; Pitch competitions", NAVY) +
            personalNote(personalMessage) +
            paragraph("Create your account with the secure link below, using this email address.") +
            button(registrationLink, "Create my account", NAVY) +
            note("This invitation is personal and can be used once. If you were not expecting it, you can safely ignore this message.") +
            signOff("The Q-AI Hub Team");
        send(to, "You're invited to join Q-AI Hub", wrap("Invitation", NAVY, body));
    }

    private static String personalNote(String message) {
        if (message == null || message.isBlank()) return "";
        return quote("<em>" + esc(message.trim()).replace("\n", "<br/>") + "</em>", NAVY);
    }

    /** Email-safe button (table-based, renders in Outlook too) with a copyable link under it. */
    private static String button(String link, String label, String color) {
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" align=\"center\" style=\"margin:28px auto;\">" +
               "<tr><td align=\"center\" style=\"background:" + color + ";border-radius:6px;\">" +
               "<a href=\"" + link + "\" style=\"display:inline-block;padding:13px 30px;font-family:" + FONT + ";font-size:13px;" +
               "font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none;\">" + label + "</a>" +
               "</td></tr></table>" +
               "<p style=\"margin:0 0 16px;font-size:12px;color:" + MUTED + ";\">If the button does not work, copy this link into your browser:<br>" +
               "<a href=\"" + link + "\" style=\"color:" + NAVY + ";word-break:break-all;\">" + link + "</a></p>";
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
            ? quote("<em>\"" + personalMessage + "\"</em><br><span style=\"font-size:12px;color:" + MUTED + ";\">— message from the founder</span>", NAVY)
            : "";
        String body =
            greeting("Hello,") +
            paragraph("You have been invited to join <strong>" + safeStartup + "</strong> as <strong>" + safeRole + "</strong> on Q-AI Hub.") +
            highlight("Startup", safeStartup, "Your role: " + safeRole, NAVY) +
            messageBlock +
            paragraph("Log in to your Q-AI Hub account and open your <strong>Invitations</strong> page to accept or decline this invite. " +
                      "If you don't have an account yet, you can register with this same email address and the invite will appear automatically.") +
            button(frontendUrl + "/invitations", "View invitation", NAVY) +
            note("If you weren't expecting this invitation, you can safely ignore it.") +
            signOff("The Q-AI Hub Team");
        send(to, "You've been invited to join " + safeStartup + " on Q-AI Hub",
             wrap("Team invitation", NAVY, body));
    }

    // ── Application emails ─────────────────────────────────────────────────────

    @Async
    public void sendApplicationAccepted(String to, String startupName, String trackingCode) {
        startupName = esc(startupName);
        String body =
            greeting("Congratulations, " + startupName + "!") +
            paragraph("Your application has been <strong style=\"color:" + SUCCESS + ";\">accepted</strong>. " +
                      "You are now an accepted participant of the event. " +
                      "We will notify you as soon as <strong>Phase 1</strong> opens so you can submit your answers.") +
            codeBox(esc(trackingCode), "Your tracking code") +
            paragraph("Use this tracking code at any time to check the status of your application, even without logging in.") +
            paragraph("Good luck! The Q-AI Hub team is rooting for you.") +
            signOff("The Q-AI Hub Team");
        send(to, "Application Accepted – Q-AI Hub", wrap("Application accepted", SUCCESS, body));
    }

    @Async
    public void sendApplicationRejected(String to, String startupName, String reason) {
        startupName = esc(startupName);
        reason = esc(reason);
        String reasonSection = (reason != null && !reason.isBlank())
            ? quote("<strong>Feedback from our team:</strong><br><em>" + reason + "</em>", DANGER)
            : "";
        String body =
            greeting("Dear " + startupName + ",") +
            paragraph("Thank you for taking the time to apply to Q-AI Hub. After careful review, " +
                      "we regret to inform you that your application has <strong style=\"color:" + DANGER + ";\">not been selected</strong> " +
                      "for this cycle.") +
            highlight("Application status", "Not selected", "This cycle", DANGER) +
            reasonSection +
            paragraph("This decision is not a reflection of your potential. We encourage you to continue building and apply again " +
                      "in our next cycle — many successful startups were accepted on their second attempt.") +
            "<p style=\"margin:24px 0 0;\">With respect and encouragement,<br><strong style=\"color:" + INK + ";\">The Q-AI Hub Team</strong></p>";
        send(to, "Your Q-AI Hub Application", wrap("Application update", DANGER, body));
    }

    // ── Pitch round emails ─────────────────────────────────────────────────────

    @Async
    public void sendPitchRoundResult(String to, String startupName, String roundName,
                                     Double score, String decision, String feedback, String aiFeedback) {
        startupName = esc(startupName);
        roundName = esc(roundName);
        aiFeedback = esc(aiFeedback);
        boolean passed = "PASSED".equalsIgnoreCase(decision);
        String color = passed ? SUCCESS : DANGER;
        String headline = passed ? "You passed " + roundName + "!" : "Thank you for pitching in " + roundName + ".";

        String body =
            greeting("Dear " + startupName + ",") +
            paragraph(headline) +
            highlight(roundName, score + " pts", "Decision: " + esc(decision), color) +
            detailsTable("Round", roundName,
                         "Score", "<strong style=\"color:" + color + ";\">" + score + " pts</strong>",
                         "Decision", "<strong style=\"color:" + color + ";\">" + decision + "</strong>") +
            "<p style=\"margin:0 0 8px;\"><strong>Feedback</strong></p>" +
            quote(String.valueOf(feedback), color) +
            paragraph(passed
                ? "Stay focused — the next stage awaits. We believe in you!"
                : "Your effort and courage to present are commendable. Keep building — every pitch is a learning experience.") +
            signOff("The Q-AI Hub Jury");

        String subject = passed
            ? "You passed " + roundName + " – Q-AI Hub"
            : "Your results from " + roundName + " – Q-AI Hub";
        send(to, subject, wrap("Pitch results", color, body));
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
            hi(esc) +
            paragraph("Your registration for <strong>" + title + "</strong> is confirmed.") +
            highlight("Event", title, date + " &middot; " + location, NAVY) +
            detailsTable("Date", date, "Location", location) +
            paragraph("See you there!") +
            signOff("The Q-AI Hub Team");
        send(to, "Registration confirmed: " + event.getTitle(), wrap("You're registered", NAVY, body));
    }

    @Async
    public void sendPhaseDecision(String to, String startupName, String phaseName, String decision, String feedback) {
        startupName = esc(startupName);
        phaseName = esc(phaseName);
        feedback = esc(feedback);
        boolean accepted = "ACCEPTED".equalsIgnoreCase(decision);
        String color = accepted ? SUCCESS : DANGER;
        String statusLabel = accepted ? "ACCEPTED" : "NOT SELECTED";

        String body =
            greeting("Dear " + startupName + ",") +
            paragraph("We have completed the review of your submission for <strong>" + phaseName + "</strong>.") +
            highlight(phaseName, statusLabel, accepted ? "You move on to the next stage" : "Review completed", color) +
            (feedback != null && !feedback.isBlank()
                ? "<p style=\"margin:0 0 8px;\"><strong>Evaluator feedback</strong></p>" + quote(feedback, color)
                : "") +
            paragraph(accepted
                ? "Congratulations! You have successfully passed this stage. Keep an eye on your dashboard for the next steps."
                : "Thank you for your effort. While we won't be moving forward with your application at this time, we appreciate your interest in the programme.") +
            signOff("The Q-AI Hub Team");

        send(to, "Update regarding " + phaseName, wrap("Phase decision", color, body));
    }
}
