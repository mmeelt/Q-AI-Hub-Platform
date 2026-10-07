package tn.enicarthage.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.enicarthage.backend.entity.Pitch;

import tn.enicarthage.backend.repository.PitchRepository;

import java.util.Date;
import java.util.Optional;

@Service
public class PitchService {

    @Autowired
    private PitchRepository pitchRepository;

    // 1. Create a new Pitch (Defaults to DRAFT status)
    public Pitch createPitch(Pitch pitch) {
        pitch.setPitchStatus("DRAFT");
        return pitchRepository.save(pitch);
    }

    // 2. Schedule the Pitch (Sets the date, venue, and updates status)
    public Pitch schedulePitch(String pitchId, Date scheduledDate, String venue) {
        Optional<Pitch> optionalPitch = pitchRepository.findById(pitchId);

        if (optionalPitch.isPresent()) {
            Pitch pitch = optionalPitch.get();
            pitch.setScheduledPresentationDate(scheduledDate);
            pitch.setPresentationVenue(venue);
            pitch.setPitchStatus("SCHEDULED");
            return pitchRepository.save(pitch);
        } else {
            throw new RuntimeException("Pitch not found with ID: " + pitchId);
        }
    }
}
