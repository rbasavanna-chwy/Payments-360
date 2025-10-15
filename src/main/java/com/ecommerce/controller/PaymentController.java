package com.ecommerce.controller;

import com.ecommerce.dto.PaymentStatistics;
import com.ecommerce.model.Payment;
import com.ecommerce.model.PaymentStatus;
import com.ecommerce.model.PaymentMethod;
import com.ecommerce.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

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
    
    @GetMapping("/aged-metrics")
    public ResponseEntity<Map<String, Object>> getAgedMetrics(
            @RequestParam(required = false) String orderType,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String paymentState,
            @RequestParam(required = false) String dateFilter,
            @RequestParam(required = false, defaultValue = "daily") String frequency) {
        
        Map<String, Object> metrics = paymentService.getAgedMetrics(
            orderType, paymentMethod, paymentState, dateFilter, frequency);
        return ResponseEntity.ok(metrics);
    }
    
    // Filter endpoints for dynamic dropdowns
    @GetMapping("/filters/payment-statuses")
    public ResponseEntity<List<Map<String, String>>> getPaymentStatuses() {
        List<Map<String, String>> statuses = Arrays.stream(PaymentStatus.values())
            .filter(status -> status != PaymentStatus.REFUNDED && status != PaymentStatus.COMPLETED) // Exclude REFUNDED and COMPLETED from filter
            .map(status -> {
                Map<String, String> statusMap = new HashMap<>();
                statusMap.put("value", status.name().toLowerCase());
                statusMap.put("label", formatEnumName(status.name()));
                return statusMap;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(statuses);
    }
    
    @GetMapping("/filters/payment-methods")
    public ResponseEntity<List<Map<String, String>>> getPaymentMethods() {
        List<Map<String, String>> methods = Arrays.stream(PaymentMethod.values())
            .map(method -> {
                Map<String, String> methodMap = new HashMap<>();
                methodMap.put("value", method.name().toLowerCase());
                methodMap.put("label", formatEnumName(method.name()));
                return methodMap;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(methods);
    }
    
    @GetMapping("/filters/order-types")
    public ResponseEntity<List<Map<String, String>>> getOrderTypes() {
        List<Map<String, String>> orderTypes = new ArrayList<>();
        
        // Add order types (these would typically come from a database or enum)
        orderTypes.add(createOption("regular", "Regular"));
        orderTypes.add(createOption("subscription", "Subscription"));
        orderTypes.add(createOption("onetime", "Onetime"));
        orderTypes.add(createOption("cvc_no_show_penality", "CVC No Show Penality"));
        orderTypes.add(createOption("loyalty", "Loyalty"));
        orderTypes.add(createOption("cwav_telemedicine", "CWAV Telemedicine"));
        
        return ResponseEntity.ok(orderTypes);
    }
    
    // Helper method to format enum names
    private String formatEnumName(String enumName) {
        return Arrays.stream(enumName.split("_"))
            .map(word -> word.substring(0, 1).toUpperCase() + word.substring(1).toLowerCase())
            .collect(Collectors.joining(" "));
    }
    
    // Helper method to create option map
    private Map<String, String> createOption(String value, String label) {
        Map<String, String> option = new HashMap<>();
        option.put("value", value);
        option.put("label", label);
        return option;
    }
}
