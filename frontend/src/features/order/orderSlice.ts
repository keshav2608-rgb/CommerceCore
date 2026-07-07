// Order slice (D19 "Checkout flow UI" + D20 "Order status/tracking page").
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as ordersApi from "../../api/ordersApi";
import { extractErrorMessage } from "../../api/client";

export interface OrderState {
  currentOrder: ordersApi.OrderResponse | null;
  orderStatus: ordersApi.OrderStatusResponse | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
}

const initialState: OrderState = {
  currentOrder: null,
  orderStatus: null,
  status: "idle",
  error: null,
};

export const createOrder = createAsyncThunk(
  "order/createOrder",
  async (
    args: { request: ordersApi.CreateOrderRequest; simulateFailure: boolean },
    { rejectWithValue }
  ) => {
    try {
      return await ordersApi.createOrder(args.request, args.simulateFailure);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Checkout failed"));
    }
  }
);

export const fetchOrderStatus = createAsyncThunk(
  "order/fetchOrderStatus",
  async (id: string | number, { rejectWithValue }) => {
    try {
      return await ordersApi.fetchOrderStatus(id);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Could not load order status"));
    }
  }
);

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    resetOrder(state) {
      state.currentOrder = null;
      state.orderStatus = null;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.status = "idle";
        state.currentOrder = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Checkout failed";
      })
      .addCase(fetchOrderStatus.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchOrderStatus.fulfilled, (state, action) => {
        state.status = "idle";
        state.orderStatus = action.payload;
      })
      .addCase(fetchOrderStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Could not load order status";
      });
  },
});

export const { resetOrder } = orderSlice.actions;
export default orderSlice.reducer;
