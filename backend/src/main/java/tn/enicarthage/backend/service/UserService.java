package tn.enicarthage.backend.service;

import tn.enicarthage.backend.dto.UpdateProfileRequest;
import tn.enicarthage.backend.dto.UserProfileResponse;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.StartupRepository;
import tn.enicarthage.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StartupRepository startupRepository;

    public void updateProfile(String userId, UpdateProfileRequest dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (dto.getFullName() != null) user.setFullName(dto.getFullName());
        if (dto.getPhoneNumber() != null) user.setPhoneNumber(dto.getPhoneNumber());
        if (dto.getUserBio() != null) user.setUserBio(dto.getUserBio());
        if (dto.getUniversityName() != null) user.setUniversityName(dto.getUniversityName());
        if (dto.getStudyField() != null) user.setStudyField(dto.getStudyField());
        if (dto.getUserSkills() != null) user.setUserSkills(dto.getUserSkills());
        if (dto.getAvatarUrl() != null) user.setAvatarUrl(dto.getAvatarUrl());
        if (dto.getPrimaryInterest() != null) user.setPrimaryInterest(dto.getPrimaryInterest());
        if (dto.getAvailability() != null) user.setAvailability(dto.getAvailability());

        userRepository.save(user);
    }

    public UserProfileResponse getUserProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserProfileResponse res = new UserProfileResponse();
        res.setUserId(user.getUserId());
        res.setEmailAddress(user.getEmailAddress());
        res.setFullName(user.getFullName());
        res.setUniversityName(user.getUniversityName());
        res.setStudentId(user.getStudentId());
        res.setPhoneNumber(user.getPhoneNumber());
        res.setStudyField(user.getStudyField());
        res.setUserSkills(user.getUserSkills());
        res.setAvatarUrl(user.getAvatarUrl());
        res.setUserBio(user.getUserBio());
        res.setPrimaryInterest(user.getPrimaryInterest());
        res.setAvailability(user.getAvailability());
        return res;
    }

    public java.util.List<Startup> manageMyStartup(String userId) {
        return startupRepository.findByFounderUserId(userId);
    }

    public void updateNotifPrefs(String userId, String prefs) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Stored as raw JSON string (frontend sends JSON text, not a JSON string literal).
        user.setNotificationPrefs(prefs);
        userRepository.save(user);
    }

    public void deleteUser(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found");
        }
        userRepository.deleteById(userId);
    }
}
