import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../features/auth/authSlice";
import { resetCart } from "../features/cart/cartSlice";

export default function Navbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const email = useAppSelector((state) => state.auth.email);
  const cartCount = useAppSelector((state) =>
    state.cart.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  function handleLogout() {
    dispatch(logout());
    dispatch(resetCart());
    navigate("/");
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        CommerceCore
      </Link>

      <nav className="navbar__links">
        <Link to="/">Browse</Link>
        <Link to="/cart" className="navbar__cart-link">
          Cart
          {cartCount > 0 && <span className="navbar__cart-badge">{cartCount}</span>}
        </Link>

        {email ? (
          <span className="navbar__user">
            <span className="navbar__email">{email}</span>
            <button type="button" onClick={handleLogout} className="navbar__logout">
              Log out
            </button>
          </span>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup" className="navbar__signup">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
