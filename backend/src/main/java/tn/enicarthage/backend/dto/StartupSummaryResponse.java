package tn.enicarthage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.enicarthage.backend.entity.Startup;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StartupSummaryResponse {
    private Startup startup;
    private List<String> appliedEventTitles;
    private List<String> appliedEventIds;
    private String lastApplicationStatus;
    private String lastApplicationId;
    private java.util.Date lastPitchDate;
}
