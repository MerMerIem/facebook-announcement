import * as React from "react";

// ──────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────
const TOAST_LIMIT = 1;           // max simultaneous toasts
const TOAST_REMOVE_DELAY = 1_000_000; // ms before hard‑remove (≈16 min)

const MOBILE_ACTIONS = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

// ──────────────────────────────────────────────────────────
// ID generator
// ──────────────────────────────────────────────────────────
let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

// ──────────────────────────────────────────────────────────
// Reducer & helpers
// ──────────────────────────────────────────────────────────
const toastTimeouts = new Map();

function addToRemoveQueue(toastId) {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // schedule removal (side effect)
      if (toastId) addToRemoveQueue(toastId);
      else state.toasts.forEach((t) => addToRemoveQueue(t.id));

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          toastId == null || t.id === toastId ? { ...t, open: false } : t
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.toastId == null) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
}

// ──────────────────────────────────────────────────────────
// In‑memory store + listeners
// ──────────────────────────────────────────────────────────
const listeners = [];
let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

// ──────────────────────────────────────────────────────────
// Public toast helpers
// ──────────────────────────────────────────────────────────
function toast(props) {
  const id = genId();

  const update = (newProps) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...newProps, id } });

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
}

// ──────────────────────────────────────────────────────────
// React hook
// ──────────────────────────────────────────────────────────
function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
