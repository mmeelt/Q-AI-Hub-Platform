package tn.enicarthage.backend.service;

import tn.enicarthage.backend.dto.CreateStartupRequest;
import tn.enicarthage.backend.dto.StartupMetricsRequest;
import tn.enicarthage.backend.dto.UpdateStartupRequest;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.StartupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StartupService {

    private final StartupRepository startupRepository;
    private final tn.enicarthage.backend.repository.TeammateInvitationRepository invitationRepository;
    private final tn.enicarthage.backend.repository.UserRepository userRepository;

    public Startup createStartup(CreateStartupRequest dto, String userId) {
        Startup startup = Startup.builder()
                .startupId(UUID.randomUUID().toString())
                .founderUserId(userId)

                .projectName(dto.getProjectName())
                .primaryFounderName(dto.getPrimaryFounderName())
                .businessSector(dto.getBusinessSector())
                .specificIndustry(dto.getSpecificIndustry())
                .companyTagline(dto.getCompanyTagline())
                .startupStatus(Startup.StartupStatus.DRAFT)
                .isUsingAiDescription(false)
                .totalFundingRaised(BigDecimal.ZERO)
                .currentTeamSize(dto.getCurrentTeamSize() != null ? dto.getCurrentTeamSize() : 1)
                .coFounderNames(dto.getCoFounderNames())
                .startupFormAnswers(dto.getStartupFormAnswers())
                .rawDescription(dto.getRawDescription())
                .companyLogoUrl(dto.getCompanyLogoUrl())
                .pitchVideoLink(dto.getPitchVideoLink())
                .pitchDeckLink(dto.getPitchDeckLink())
                .companyWebsiteUrl(dto.getCompanyWebsiteUrl())
                .developerProgressPct(0)
                .build();

        return startupRepository.save(startup);
    }

    public java.util.List<Startup> getAllStartups() {
        return startupRepository.findAll();
    }

    public java.util.List<Startup> getStartupsByFounder(String userId) {
        // 1. Get startups where user is the founder
        java.util.List<Startup> founded = startupRepository.findByFounderUserId(userId);
        
        // 2. Get startups where user is an accepted teammate
        java.util.Optional<tn.enicarthage.backend.entity.User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            String email = userOpt.get().getEmailAddress();
            java.util.List<String> joinedStartupIds = invitationRepository
                .findByInviteeEmailAndStatus(email, tn.enicarthage.backend.entity.TeammateInvitation.InvitationStatus.ACCEPTED)
                .stream()
                .map(tn.enicarthage.backend.entity.TeammateInvitation::getStartupId)
                .collect(java.util.stream.Collectors.toList());
            
            if (!joinedStartupIds.isEmpty()) {
                java.util.List<Startup> joined = startupRepository.findByStartupIdIn(joinedStartupIds);
                // Merge lists and remove duplicates
                java.util.Set<String> foundedIds = founded.stream().map(Startup::getStartupId).collect(java.util.stream.Collectors.toSet());
                for (Startup s : joined) {
                    if (!foundedIds.contains(s.getStartupId())) {
                        founded.add(s);
                    }
                }
            }
        }
        
        return founded;
    }

    public java.util.Optional<Startup> getStartupById(String startupId) {
        return startupRepository.findById(startupId);
    }

    public void updateStartupProfile(String startupId, UpdateStartupRequest dto, String userId) {
        Startup startup = startupRepository.findById(startupId)
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));
        checkOwnership(startup, userId);

        if (dto.getProjectName() != null)
            startup.setProjectName(dto.getProjectName());
        if (dto.getPrimaryFounderName() != null)
            startup.setPrimaryFounderName(dto.getPrimaryFounderName());
        if (dto.getCoFounderNames() != null)
            startup.setCoFounderNames(dto.getCoFounderNames());
        if (dto.getBusinessSector() != null)
            startup.setBusinessSector(dto.getBusinessSector());
        if (dto.getSpecificIndustry() != null)
            startup.setSpecificIndustry(dto.getSpecificIndustry());
        if (dto.getCompanyTagline() != null)
            startup.setCompanyTagline(dto.getCompanyTagline());
        if (dto.getCompanyWebsiteUrl() != null)
            startup.setCompanyWebsiteUrl(dto.getCompanyWebsiteUrl());
        if (dto.getCompanyLogoUrl() != null)
            startup.setCompanyLogoUrl(dto.getCompanyLogoUrl());
        if (dto.getPitchVideoLink() != null)
            startup.setPitchVideoLink(dto.getPitchVideoLink());
        if (dto.getPitchDeckLink() != null)
            startup.setPitchDeckLink(dto.getPitchDeckLink());
        if (dto.getRawDescription() != null)
            startup.setRawDescription(dto.getRawDescription());
        if (dto.getAiGeneratedDescription() != null)
            startup.setAiGeneratedDescription(dto.getAiGeneratedDescription());
        if (dto.getIsUsingAiDescription() != null)
            startup.setIsUsingAiDescription(dto.getIsUsingAiDescription());
        if (dto.getTotalFundingRaised() != null)
            startup.setTotalFundingRaised(dto.getTotalFundingRaised());
        if (dto.getCurrentTeamSize() != null)
            startup.setCurrentTeamSize(dto.getCurrentTeamSize());
        if (dto.getDeveloperProgressPct() != null)
            startup.setDeveloperProgressPct(dto.getDeveloperProgressPct());
        if (dto.getStartupStage() != null)
            startup.setStartupStage(dto.getStartupStage());
        if (dto.getStartupStatus() != null)
            startup.setStartupStatus(dto.getStartupStatus());
        if (dto.getStartupFormAnswers() != null)
            startup.setStartupFormAnswers(dto.getStartupFormAnswers());

        startupRepository.save(startup);
    }

    public String getActiveDescription(String startupId) {
        Startup startup = startupRepository.findById(startupId)
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));

        return Boolean.TRUE.equals(startup.getIsUsingAiDescription())
                ? startup.getAiGeneratedDescription()
                : startup.getRawDescription();
    }

    public void updateStartupStatus(String startupId, Startup.StartupStatus newStatus, String userId) {
        Startup startup = startupRepository.findById(startupId)
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));
        checkOwnership(startup, userId);
        startup.setStartupStatus(newStatus);
        startupRepository.save(startup);
    }

    public void addTeamMember(String startupId, String newMemberUserId, String requesterUserId) {
        Startup startup = startupRepository.findById(startupId)
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));
        checkOwnership(startup, requesterUserId);
        startup.setCurrentTeamSize(startup.getCurrentTeamSize() + 1);
        startupRepository.save(startup);
    }

    public void updateFundingAmount(String startupId, BigDecimal amount, String userId) {
        Startup startup = startupRepository.findById(startupId)
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));
        checkOwnership(startup, userId);
        startup.setTotalFundingRaised(amount);
        startupRepository.save(startup);
    }

    public void publishStartupUpdate(String startupId, Object updateData, String userId) {
        Startup startup = startupRepository.findById(startupId)
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));
        checkOwnership(startup, userId);
        // Implement logic to publish update (e.g., save to a news feed entity if it
        // existed)
        log.info("Publishing update for startup {}", startupId);
    }

    public Startup updateStartupMetrics(String startupId, StartupMetricsRequest metrics, String userId) {
        Startup startup = startupRepository.findById(startupId)
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));
        checkOwnership(startup, userId);

        if (metrics.getMonthlyRevenue() != null)
            startup.setMonthlyRevenue(metrics.getMonthlyRevenue());
        if (metrics.getGrowthRatePct() != null)
            startup.setGrowthRatePct(metrics.getGrowthRatePct());
        if (metrics.getMonthlyBurnRate() != null)
            startup.setMonthlyBurnRate(metrics.getMonthlyBurnRate());
        if (metrics.getOverallProgressPct() != null)
            startup.setOverallProgressPct(metrics.getOverallProgressPct());
        if (metrics.getAccuracyRatePct() != null)
            startup.setAccuracyRatePct(metrics.getAccuracyRatePct());
        if (metrics.getTotalFundingRaised() != null)
            startup.setTotalFundingRaised(metrics.getTotalFundingRaised());

        return startupRepository.save(startup);
    }

    public void submitPitch(String startupId, Object pitchData, String userId) {
        Startup startup = startupRepository.findById(startupId)
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));
        checkOwnership(startup, userId);
        // logic to handle pitch submission
        log.info("Submitting pitch for startup: {}", startup.getProjectName());
    }

    private void checkOwnership(Startup startup, String userId) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));

        if (!isAdmin && !startup.getFounderUserId().equals(userId)) {
            // Check if user is an accepted teammate
            java.util.Optional<tn.enicarthage.backend.entity.User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                String email = userOpt.get().getEmailAddress();
                boolean isTeammate = invitationRepository.findByStartupIdAndInviteeEmail(startup.getStartupId(), email)
                    .map(inv -> inv.getStatus() == tn.enicarthage.backend.entity.TeammateInvitation.InvitationStatus.ACCEPTED)
                    .orElse(false);
                
                if (isTeammate) return; // Authorized
            }
            throw new AccessDeniedException("Not authorized to modify this startup");
        }
    }

}
