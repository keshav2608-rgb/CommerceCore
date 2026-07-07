// Catalog slice (D17 "Product listing + search/filter UI").
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as productsApi from "../../api/productsApi";
import { extractErrorMessage } from "../../api/client";

export interface CatalogState {
  items: productsApi.Product[];
  page: number;
  limit: number;
  total: number;
  search: string;
  minPrice: string;
  maxPrice: string;
  status: "idle" | "loading" | "failed";
  error: string | null;
}

const initialState: CatalogState = {
  items: [],
  page: 1,
  limit: 12,
  total: 0,
  search: "",
  minPrice: "",
  maxPrice: "",
  status: "idle",
  error: null,
};

export const fetchProducts = createAsyncThunk(
  "catalog/fetchProducts",
  async (query: productsApi.ProductQuery, { rejectWithValue }) => {
    try {
      return await productsApi.fetchProducts(query);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Could not load products"));
    }
  }
);

const catalogSlice = createSlice({
  name: "catalog",
  initialState,
  reducers: {
    setSearch(state, action: { payload: string }) {
      state.search = action.payload;
      state.page = 1;
    },
    setPriceRange(state, action: { payload: { minPrice: string; maxPrice: string } }) {
      state.minPrice = action.payload.minPrice;
      state.maxPrice = action.payload.maxPrice;
      state.page = 1;
    },
    setPage(state, action: { payload: number }) {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload.items;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.total = action.payload.total;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Could not load products";
      });
  },
});

export const { setSearch, setPriceRange, setPage } = catalogSlice.actions;
export default catalogSlice.reducer;
