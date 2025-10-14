package com.ecommerce.service;

import com.ecommerce.dto.PaymentStatistics;
import com.ecommerce.model.Payment;
import com.ecommerce.model.PaymentMethod;
import com.ecommerce.model.PaymentStatus;
import com.ecommerce.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {
    
    private final PaymentRepository paymentRepository;
    
    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }
    
    @Transactional
    public Payment createPayment(Payment payment) {
        payment.setTransactionId(generateTransactionId());
        payment.setCreatedAt(LocalDateTime.now());
        payment.setStatus(PaymentStatus.PENDING);
        return paymentRepository.save(payment);
    }
    
    @Transactional
    public Payment updatePaymentStatus(Long id, PaymentStatus status, String errorMessage) {
        Optional<Payment> paymentOpt = paymentRepository.findById(id);
        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();
            payment.setStatus(status);
            payment.setUpdatedAt(LocalDateTime.now());
            if (errorMessage != null) {
                payment.setErrorMessage(errorMessage);
            }
            return paymentRepository.save(payment);
        }
        throw new RuntimeException("Payment not found with id: " + id);
    }
    
    public List<Payment> getAllPayments() {
        return paymentRepository.findAllOrderByCreatedAtDesc();
    }
    
    public List<Payment> getPaymentsByStatus(PaymentStatus status) {
        return paymentRepository.findByStatus(status);
    }
    
    public List<Payment> getRecentPayments(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return paymentRepository.findRecentPayments(since);
    }
    
    public Optional<Payment> getPaymentById(Long id) {
        return paymentRepository.findById(id);
    }
    
    public PaymentStatistics getPaymentStatistics() {
        List<Payment> allPayments = paymentRepository.findAll();
        
        long total = allPayments.size();
        long completed = paymentRepository.countByStatus(PaymentStatus.COMPLETED);
        long pending = paymentRepository.countByStatus(PaymentStatus.PENDING);
        long failed = paymentRepository.countByStatus(PaymentStatus.FAILED);
        long refunded = paymentRepository.countByStatus(PaymentStatus.REFUNDED);
        
        Double totalAmount = allPayments.stream()
                .mapToDouble(Payment::getAmount)
                .sum();
        
        Double completedAmount = paymentRepository.sumAmountByStatus(PaymentStatus.COMPLETED);
        if (completedAmount == null) completedAmount = 0.0;
        
        double successRate = total > 0 ? (completed * 100.0) / total : 0.0;
        double avgTransaction = total > 0 ? totalAmount / total : 0.0;
        
        return new PaymentStatistics(
                total,
                completed,
                pending,
                failed,
                refunded,
                totalAmount,
                completedAmount,
                successRate,
                avgTransaction
        );
    }
    
    @Transactional
    public void generateSampleData() {
        if (paymentRepository.count() > 0) {
            return;
        }
        
        String[] customerNames = {"John Doe", "Jane Smith", "Bob Johnson", "Alice Williams", "Charlie Brown"};
        String[] countries = {"USA", "UK", "Canada", "Australia", "Germany"};
        PaymentStatus[] statuses = PaymentStatus.values();
        PaymentMethod[] methods = PaymentMethod.values();
        
        for (int i = 0; i < 50; i++) {
            Payment payment = new Payment();
            payment.setTransactionId(generateTransactionId());
            payment.setCustomerId("CUST" + String.format("%05d", i + 1));
            payment.setCustomerName(customerNames[i % customerNames.length]);
            payment.setCustomerEmail(payment.getCustomerName().toLowerCase().replace(" ", ".") + "@example.com");
            payment.setAmount(Math.round((Math.random() * 500 + 10) * 100.0) / 100.0);
            payment.setCurrency("USD");
            payment.setStatus(statuses[i % statuses.length]);
            payment.setPaymentMethod(methods[i % methods.length]);
            payment.setCreatedAt(LocalDateTime.now().minusHours((int)(Math.random() * 72)));
            payment.setDescription("Order payment #" + (i + 1));
            payment.setOrderId("ORD" + String.format("%06d", i + 1));
            payment.setIpAddress("192.168." + (i % 255) + "." + ((i * 7) % 255));
            payment.setCountry(countries[i % countries.length]);
            
            if (payment.getStatus() == PaymentStatus.FAILED) {
                payment.setErrorMessage("Insufficient funds");
            }
            
            paymentRepository.save(payment);
        }
    }
    
    private String generateTransactionId() {
        return "TXN" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }
}
