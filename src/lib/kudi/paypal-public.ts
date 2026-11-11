/** Public sandbox client id. PayPal expects this in the browser. It is not a secret. */
export const PAYPAL_SANDBOX_CLIENT_ID =
  "AYprSH_MmG_gzWPe4i1BeHnr9Jbio60v92P9lO7xW5qIgguLG26sjklU96o2CeeVXq3mqz0TDQi5jf0B";

type PaypalOrderActions = {
  order: {
    create: (order: {
      intent: "CAPTURE";
      purchase_units: { description?: string; amount: { currency_code: "USD"; value: string } }[];
    }) => Promise<string>;
    capture: () => Promise<{ id?: string; status?: string }>;
  };
};

type PaypalButtons = {
  close: () => Promise<void>;
  render: (target: HTMLElement) => Promise<void>;
};

type PaypalNamespace = {
  Buttons: (options: {
    style?: { layout?: "vertical"; color?: "black"; shape?: "pill"; label?: "paypal" };
    createOrder: (data: unknown, actions: PaypalOrderActions) => Promise<string>;
    onApprove: (data: { orderID: string }, actions: PaypalOrderActions) => Promise<void>;
    onCancel?: () => void;
    onError?: () => void;
  }) => PaypalButtons;
};

declare global {
  interface Window {
    paypal?: PaypalNamespace;
  }
}

let loading: Promise<void> | null = null;

export function loadPaypalSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.paypal) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_SANDBOX_CLIENT_ID}&currency=USD&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("PayPal sandbox did not load."));
    };
    document.head.appendChild(script);
  });
  return loading;
}
