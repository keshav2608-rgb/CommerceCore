import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchOrderStatus } from "../features/order/orderSlice";

const STATUS_COPY: Record<string, string> = {
  PENDING: "Your order is being processed.",
  PAID: "Payment succeeded — your order is confirmed.",
  FAILED: "Payment failed. No stock was reserved for this order.",
};

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { orderStatus, status, error } = useAppSelector((state) => state.order);

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderStatus(id));
    }
  }, [dispatch, id]);

  if (!id) {
    return <p className="error-text">Missing order id.</p>;
  }

  return (
    <div className="page order-status-page">
      <h1>Order #{id}</h1>

      {status === "loading" && <p>Loading order status…</p>}
      {status === "failed" && <p className="error-text">{error}</p>}

      {orderStatus && (
        <div className={`order-status order-status--${orderStatus.status.toLowerCase()}`}>
          <p className="order-status__badge">{orderStatus.status}</p>
          <p>{STATUS_COPY[orderStatus.status] ?? "Status unavailable."}</p>
        </div>
      )}

      <div className="order-status__actions">
        <button type="button" onClick={() => dispatch(fetchOrderStatus(id))}>
          Refresh status
        </button>
        <Link to="/">Continue shopping</Link>
      </div>
    </div>
  );
}
