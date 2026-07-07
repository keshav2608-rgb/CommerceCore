// Auth slice (Section 12 "Redux store (auth, cart, catalog slices)").
// Tokens are persisted to localStorage so a page refresh doesn't force a
// re-login — this is a Month-1-appropriate choice consistent with the
// backend's own shared-secret/HS256 simplifications documented in the
// project README; a Month-2 upgrade might move refresh tokens to an
// httpOnly cookie instead.
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as authApi from "../../api/authApi";
import { extractErrorMessage } from "../../api/client";
import { decodeToken } from "../../api/jwt";

const STORAGE_KEY = "commercecore.session";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  email: string | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
}

interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: StoredSession | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const stored = loadStoredSession();
const initialState: AuthState = {
  accessToken: stored?.accessToken ?? null,
  refreshToken: stored?.refreshToken ?? null,
  email: stored ? decodeToken(stored.accessToken)?.sub ?? null : null,
  status: "idle",
  error: null,
};

export const signup = createAsyncThunk(
  "auth/signup",
  async (credentials: authApi.Credentials, { rejectWithValue }) => {
    try {
      return await authApi.signup(credentials);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Signup failed"));
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: authApi.Credentials, { rejectWithValue }) => {
    try {
      return await authApi.login(credentials);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, "Invalid email or password"));
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.email = null;
      state.status = "idle";
      state.error = null;
      persistSession(null);
    },
    // Called by the axios response interceptor after a successful silent
    // refresh (see api/client.ts's injectSessionHandlers).
    sessionRefreshed(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.email = decodeToken(action.payload.accessToken)?.sub ?? state.email;
      persistSession(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.status = "idle";
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.email = decodeToken(action.payload.accessToken)?.sub ?? null;
        persistSession(action.payload);
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Signup failed";
      })
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "idle";
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.email = decodeToken(action.payload.accessToken)?.sub ?? null;
        persistSession(action.payload);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Invalid email or password";
      });
  },
});

export const { logout, sessionRefreshed } = authSlice.actions;
export default authSlice.reducer;
