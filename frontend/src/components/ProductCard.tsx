import { useNavigate } from "react-router-dom";
import type { Product } from "../api/productsApi";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addCartItem } from "../features/cart/cartSlice";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.accessToken));
  const isOutOfStock = product.stock <= 0;

  function handleAddToCart() {
    if (!isAuthenticated) {
      // Cart endpoints require auth (cart.routes.ts: requireAuth) — send the
      // shopper to log in rather than let the request fail with a 401.
      navigate("/login", { state: { from: { pathname: "/" } } });
      return;
    }

    dispatch(
      addCartItem({
        productId: product._id,
        quantity: 1,
        name: product.name,
        price: product.price,
        stock: product.stock,
      })
    );
  }

  return (
    <article className="product-card">
      <h3 className="product-card__name">{product.name}</h3>
      <p className="product-card__description">{product.description}</p>
      <div className="product-card__meta">
        <span className="product-card__price">${product.price.toFixed(2)}</span>
        <span className={isOutOfStock ? "product-card__stock--out" : "product-card__stock"}>
          {isOutOfStock ? "Out of stock" : `${product.stock} in stock`}
        </span>
      </div>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isOutOfStock}
        className="product-card__add-button"
      >
        Add to cart
      </button>
    </article>
  );
}
