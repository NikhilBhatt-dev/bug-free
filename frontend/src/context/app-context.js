"use client";

import { createContext, useContext, useReducer } from "react";

const AppContext = createContext(null);

const initialState = {
  user: null,
  isAuthenticated: false,
};

function appReducer(state, action) {
  switch (action.type) {
    case "AUTHENTICATED":
      return { ...state, user: action.payload, isAuthenticated: true };
    case "SIGNED_OUT":
      return initialState;
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used inside AppProvider");
  return context;
}
