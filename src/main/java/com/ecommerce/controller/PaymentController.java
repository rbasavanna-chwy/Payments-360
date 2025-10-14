package com.ecommerce.controller;

import com.ecommerce.dto.PaymentStatistics;
import com.ecommerce.model.Payment;
import com.ecommerce.model.PaymentStatus;
import com.ecommerce.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {
    
    private final PaymentService paymentService;
    
    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
    
    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentService.getAllPayments();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Payment> getPaymentById(@PathVariable Long id) {
        Optional<Payment> payment = paymentService.getPaymentById(id);
        return payment.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/status/{status}")
    public List<Payment> getPaymentsByStatus(@PathVariable PaymentStatus status) {
        return paymentService.getPaymentsByStatus(status);
    }
    
    @GetMapping("/recent/{hours}")
    public List<Payment> getRecentPayments(@PathVariable int hours) {
        return paymentService.getRecentPayments(hours);
    }
    
    @GetMapping("/statistics")
    public PaymentStatistics getPaymentStatistics() {
        return paymentService.getPaymentStatistics();
    }
    
    @PostMapping
    public ResponseEntity<Payment> createPayment(@RequestBody Payment payment) {
        Payment created = paymentService.createPayment(payment);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    @PutMapping("/{id}/status")
    public ResponseEntity<Payment> updatePaymentStatus(
            @PathVariable Long id,
            @RequestParam PaymentStatus status,
            @RequestParam(required = false) String errorMessage) {
        try {
            Payment updated = paymentService.updatePaymentStatus(id, status, errorMessage);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/generate-sample-data")
    public ResponseEntity<String> generateSampleData() {
        paymentService.generateSampleData();
        return ResponseEntity.ok("Sample data generated successfully");
    }
}
