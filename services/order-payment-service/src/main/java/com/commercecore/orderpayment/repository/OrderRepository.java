package com.commercecore.orderpayment.repository;

import com.commercecore.orderpayment.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
}
