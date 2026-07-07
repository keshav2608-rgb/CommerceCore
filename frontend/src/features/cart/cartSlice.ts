// Cart slice (D18 "Cart UI with optimistic updates").
//
// Pattern: on the *pending* action, the UI is updated immediately from
// data the caller already has in hand (a product's name/price/stock from
// the catalog list) — the user sees the change instantly instead of
// waiting on a round trip. On *fulfilled*, the optimistic guess is
// discarded and replaced with the server's authoritative hydrated cart
// (cart.controller.ts's hydrateCart — the real source of truth for
// stock-checked quantities and current prices). On *rejected* (e.g. a 409
// InsufficientStock from cart.controller.ts), the pre-optimistic snapshot
// is restored so the UI never shows a state the server actually rejected.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as cartApi from "../../api/cartApi";
import { extractErrorMessage } from "../../api/client";

export interface CartState {
  items: cartApi.CartItem[];
  subtotal: number;
  status: "idle" | "loading" | "failed";
  error: string | null;
  snapshot: { items: cartApi.CartItem[]; subtotal: number } | null;
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  status: "idle",
  error: null,
  snapshot: null,
};

export const fetchCart = createAsyncThunk("cart/fetchCart", async (_: void, { rejectWithValue }) => {
  try {
    return await cartApi.fetchCart();
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Could not load cart"));
  }
});

export interface AddCartItemArg {
  productId: string;
  quantity: number;
  // Carried along purely so the optimistic reducer can render something
  // sensible before the server responds — never sent to the API.
  name: string;
  price: number;
  stock: number;
}

export const addCartItem = createAsyncThunk(
  "cart/addCartItem",
  async (arg: AddCartItemArg, { rejectWithValue }) => {
    try {
      return await cartApi.addCartItem(arg.productId, arg.quantity);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Could not add item to cart"));
    }
  }
);

export const removeCartItem = createAsyncThunk(
  "cart/removeCartItem",
  async (productId: string, { rejectWithValue }) => {
    try {
      return await cartApi.removeCartItem(productId);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Could not remove item"));
    }
  }
);

export const clearCart = createAsyncThunk("cart/clearCart", async (_: void, { rejectWithValue }) => {
  try {
    return await cartApi.clearCart();
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err, "Could not clear cart"));
  }
});

function snapshotOf(state: CartState): { items: cartApi.CartItem[]; subtotal: number } {
  return { items: state.items.map((i) => ({ ...i })), subtotal: state.subtotal };
}

function recomputeSubtotal(items: cartApi.CartItem[]): number {
  return Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Used on logout so a previous user's cart never flashes for the next one.
    resetCart(state) {
      state.items = [];
      state.subtotal = 0;
      state.status = "idle";
      state.error = null;
      state.snapshot = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Could not load cart";
      })

      // --- addCartItem: optimistic ---
      .addCase(addCartItem.pending, (state, action) => {
        state.snapshot = snapshotOf(state);
        state.error = null;
        const { productId, quantity, name, price, stock } = action.meta.arg;
        const existing = state.items.find((i) => i.productId === productId);
        if (existing) {
          existing.quantity += quantity;
        } else {
          state.items.push({ productId, name, price, quantity, stock });
        }
        state.subtotal = recomputeSubtotal(state.items);
      })
      .addCase(addCartItem.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
        state.snapshot = null;
      })
      .addCase(addCartItem.rejected, (state, action) => {
        if (state.snapshot) {
          state.items = state.snapshot.items;
          state.subtotal = state.snapshot.subtotal;
        }
        state.snapshot = null;
        state.error = (action.payload as string) ?? "Could not add item to cart";
      })

      // --- removeCartItem: optimistic ---
      .addCase(removeCartItem.pending, (state, action) => {
        state.snapshot = snapshotOf(state);
        state.error = null;
        state.items = state.items.filter((i) => i.productId !== action.meta.arg);
        state.subtotal = recomputeSubtotal(state.items);
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
        state.snapshot = null;
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        if (state.snapshot) {
          state.items = state.snapshot.items;
          state.subtotal = state.snapshot.subtotal;
        }
        state.snapshot = null;
        state.error = (action.payload as string) ?? "Could not remove item";
      })

      // --- clearCart ---
      .addCase(clearCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
      });
  },
});

export const { resetCart } = cartSlice.actions;
export default cartSlice.reducer;
