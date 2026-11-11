import { useEffect, useRef } from "react";
import { loadPaypalSdk } from "@/lib/kudi/paypal-public";

export function PaypalCheckout({
  usd,
  description,
  onCaptured,
  onFailed,
}: {
  usd: string;
  description: string;
  onCaptured: (orderId: string) => void;
  onFailed: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const captured = useRef(onCaptured);
  const failed = useRef(onFailed);
  captured.current = onCaptured;
  failed.current = onFailed;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false;
    let buttons: { close: () => Promise<void>; render: (target: HTMLElement) => Promise<void> } | null = null;

    void loadPaypalSdk()
      .then(async () => {
        if (cancelled || !window.paypal || !node) return;
        node.replaceChildren();
        buttons = window.paypal.Buttons({
          style: { layout: "vertical", color: "black", shape: "pill", label: "paypal" },
          createOrder: (_data, actions) =>
            actions.order.create({
              intent: "CAPTURE",
              purchase_units: [
                {
                  description,
                  amount: { currency_code: "USD", value: usd },
                },
              ],
            }),
          onApprove: async (data, actions) => {
            const result = await actions.order.capture();
            const orderId = result.id || data.orderID;
            if (result.status !== "COMPLETED" || !orderId) {
              failed.current("PayPal did not complete that payment.");
              return;
            }
            captured.current(orderId);
          },
          onCancel: () => failed.current("Checkout cancelled. Nothing was added to the pocket."),
          onError: () => failed.current("PayPal could not finish the sandbox checkout."),
        });
        await buttons.render(node);
      })
      .catch(() => {
        if (!cancelled) failed.current("PayPal sandbox did not load. Check the connection and try again.");
      });

    return () => {
      cancelled = true;
      void buttons?.close().catch(() => undefined);
    };
  }, [usd, description]);

  return <div ref={host} className="min-h-14" />;
}
