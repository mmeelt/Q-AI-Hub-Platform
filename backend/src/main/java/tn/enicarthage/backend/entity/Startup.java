package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "startups")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Startup {

    @Id
    private String startupId;

    @Column(nullable = false)
    private String founderUserId;

    private String projectName;
    private String primaryFounderName;

    @ElementCollection
    @CollectionTable(name = "startup_co_founders", joinColumns = @JoinColumn(name = "startup_id"))
    @Column(name = "co_founder_name")
    private List<String> coFounderNames;

    private String businessSector;
    private String specificIndustry;
    private String companyTagline;
    private String companyWebsiteUrl;
    private String companyLogoUrl;
    private String pitchVideoLink;
    private String pitchDeckLink;

    @Column(columnDefinition = "TEXT")
    private String rawDescription;

    @Column(columnDefinition = "TEXT")
    private String aiGeneratedDescription;

    private Boolean isUsingAiDescription;
    @Column(precision = 19, scale = 4)
    private BigDecimal totalFundingRaised;
    
    private Integer currentTeamSize;
    private Integer developerProgressPct;
    private String startupStage;

    // Admin Managed Metrics
    private BigDecimal monthlyRevenue;
    private Double growthRatePct;
    private BigDecimal monthlyBurnRate;
    private Integer overallProgressPct;
    private Double accuracyRatePct;

    @Enumerated(EnumType.STRING)
    private StartupStatus startupStatus;

    @Column(columnDefinition = "TEXT")
    private String startupFormAnswers;

    public enum StartupStatus { DRAFT, ACTIVE, INACTIVE }
}
