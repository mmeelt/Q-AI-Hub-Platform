package tn.enicarthage.backend.dto;

import lombok.Data;

@Data
public class CreateStartupRequest {
    private String projectName;
    private String primaryFounderName;
    private String businessSector;
    private String specificIndustry;
    private String companyTagline;
    private Integer currentTeamSize;
    private String startupFormAnswers;
    private java.util.List<String> coFounderNames;
    private String rawDescription;
    private String companyLogoUrl;
    private String pitchVideoLink;
    private String pitchDeckLink;
    private String companyWebsiteUrl;
}
