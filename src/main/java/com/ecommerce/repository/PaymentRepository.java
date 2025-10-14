package com.ecommerce.repository;

import com.ecommerce.model.Payment;
import com.ecommerce.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    
    List<Payment> findByStatus(PaymentStatus status);
    
    @Query("SELECT p FROM Payment p WHERE p.createdAt >= :since ORDER BY p.createdAt DESC")
    List<Payment> findRecentPayments(@Param("since") LocalDateTime since);
    
    @Query("SELECT p FROM Payment p ORDER BY p.createdAt DESC")
    List<Payment> findAllOrderByCreatedAtDesc();
    
    long countByStatus(PaymentStatus status);
    
    @Query("SELECT COALESCE(SUM(p.amount), 0.0) FROM Payment p WHERE p.status = :status")
    Double sumAmountByStatus(@Param("status") PaymentStatus status);
}
