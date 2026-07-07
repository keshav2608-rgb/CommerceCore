import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchCart, removeCartItem, clearCart } from "../features/cart/cartSlice";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const { items, subtotal, status, error } = useAppSelector((state) => state.cart);
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.accessToken));

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [dispatch, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="page cart-page">
        <h1>Your cart</h1>
        <p>
          <Link to="/login">Log in</Link> to view your cart.
        </p>
      </div>
    );
  }

  return (
    <div className="page cart-page">
      <h1>Your cart</h1>

      {status === "loading" && items.length === 0 && <p>Loading cart…</p>}
      {error && <p className="error-text">{error}</p>}

      {items.length === 0 ? (
        <p>
          Your cart is empty. <Link to="/">Browse products</Link>.
        </p>
      ) : (
        <>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Line total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>{item.quantity}</td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                  <td>
                    <button type="button" onClick={() => dispatch(removeCartItem(item.productId))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cart-summary">
            <strong>Subtotal: ${subtotal.toFixed(2)}</strong>
            <div className="cart-summary__actions">
              <button type="button" onClick={() => dispatch(clearCart())}>
                Clear cart
              </button>
              <Link to="/checkout" className="cart-summary__checkout-button">
                Checkout
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
