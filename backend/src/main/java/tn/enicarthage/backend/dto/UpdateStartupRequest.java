package tn.enicarthage.backend.dto;

import tn.enicarthage.backend.entity.Startup;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class UpdateStartupRequest {
    private String projectName;
    private String primaryFounderName;
    private List<String> coFounderNames;
    private String businessSector;
    private String specificIndustry;
    private String companyTagline;
    private String companyWebsiteUrl;
    private String companyLogoUrl;
    private String pitchVideoLink;
    private String pitchDeckLink;
    private String rawDescription;
    private String aiGeneratedDescription;
    private Boolean isUsingAiDescription;
    private BigDecimal totalFundingRaised;
    private Integer currentTeamSize;
    private Integer developerProgressPct;
    private String startupStage;
    private Startup.StartupStatus startupStatus;
    private String startupFormAnswers;
}
