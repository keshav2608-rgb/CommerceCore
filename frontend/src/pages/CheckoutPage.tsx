import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { createOrder, resetOrder } from "../features/order/orderSlice";
import { fetchCart } from "../features/cart/cartSlice";

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, subtotal } = useAppSelector((state) => state.cart);
  const { status, error } = useAppSelector((state) => state.order);

  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  // Test-only flag that exists purely so the mock-payment failure path is
  // reachable from the UI too, matching the `simulateFailure` query param
  // OrderController.java already accepts (see openapi.yaml, Section 8).
  const [simulateFailure, setSimulateFailure] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    dispatch(resetOrder());
    const result = await dispatch(
      createOrder({ request: { addressLine1, city, postalCode }, simulateFailure })
    );
    if (createOrder.fulfilled.match(result)) {
      dispatch(fetchCart());
      navigate(`/orders/${result.payload.id}`);
    }
  }

  if (items.length === 0) {
    return (
      <div className="page checkout-page">
        <h1>Checkout</h1>
        <p>
          Your cart is empty — <Link to="/">browse products</Link> before checking out.
        </p>
      </div>
    );
  }

  return (
    <div className="page checkout-page">
      <h1>Checkout</h1>

      <div className="checkout-summary">
        <strong>Order total: ${subtotal.toFixed(2)}</strong>
        <span>{items.length} item(s)</span>
      </div>

      <form onSubmit={handleSubmit} className="checkout-form">
        <label htmlFor="addressLine1">Address</label>
        <input
          id="addressLine1"
          required
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
        />

        <label htmlFor="city">City</label>
        <input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />

        <label htmlFor="postalCode">Postal code</label>
        <input
          id="postalCode"
          required
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />

        <label className="checkout-form__checkbox-label">
          <input
            type="checkbox"
            checked={simulateFailure}
            onChange={(e) => setSimulateFailure(e.target.checked)}
          />
          Simulate payment failure (test only)
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Placing order…" : "Place order"}
        </button>
      </form>
    </div>
  );
}
