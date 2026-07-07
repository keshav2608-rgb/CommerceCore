import { configureStore } from "@reduxjs/toolkit";
import authReducer, { logout, sessionRefreshed } from "../features/auth/authSlice";
import catalogReducer from "../features/catalog/catalogSlice";
import cartReducer, { resetCart } from "../features/cart/cartSlice";
import orderReducer from "../features/order/orderSlice";
import { injectSessionHandlers } from "../api/client";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    catalog: catalogReducer,
    cart: cartReducer,
    order: orderReducer,
  },
});

// Wires the axios client (api/client.ts) to the store without a circular
// import: client.ts never imports store.ts, it just calls these injected
// functions, which are defined here where both modules are already in scope.
injectSessionHandlers({
  getSession: () => ({
    accessToken: store.getState().auth.accessToken,
    refreshToken: store.getState().auth.refreshToken,
  }),
  onRefreshed: (accessToken, refreshToken) => {
    store.dispatch(sessionRefreshed({ accessToken, refreshToken }));
  },
  onRefreshFailed: () => {
    store.dispatch(logout());
    store.dispatch(resetCart());
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
