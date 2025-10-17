package com.ecommerce.repository;

import com.ecommerce.model.AlertSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AlertSettingsRepository extends JpaRepository<AlertSettings, Long> {
    
    // Get the most recent settings (we'll only have one row)
    Optional<AlertSettings> findFirstByOrderByIdDesc();
}


