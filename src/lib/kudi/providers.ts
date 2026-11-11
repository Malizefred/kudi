/** Provider approval is never a wallet credit. The ledger is a separate step. */
export const PROVIDERS = {
  paypal_sandbox: {
    id: "paypal_sandbox",
    label: "PayPal sandbox",
    creditsLedger: false,
  },
} as const;
