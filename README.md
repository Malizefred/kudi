# Kudi

A multi-currency wallet for Nigeria, Ghana, Kenya, and US dollars. Hold a demo dollar balance, exchange it for naira, cedis, or shillings, and send money to people you know. The same requests work from the in-app assistant or from a block you paste out of Claude or ChatGPT.

Built for the PayPal AI Hackathon.

## What you can do

- Create an account with Google, X, or email and password.
- Hold USD, NGN, GHS, and KES in one wallet.
- Exchange between those currencies at a labelled demo rate.
- Send to contacts (Adaeze, Chidi, Mama, Amina, Kwame, Zuri), a Kudi handle, or a PayPal email.
- Receive on your handle, copy it, share it, or request money.
- Buy airtime (MTN, Airtel, Glo, 9mobile) from the naira wallet.
- Talk to pay: “Send $10 to Adaeze”, “Convert 150,000 naira to dollars”, “Buy 500 MTN airtime”.
- Confirm larger payments with a PIN. The demo PIN starts at `1234`.

## PayPal

Buying dollars opens the real **PayPal JavaScript SDK** against the sandbox. After capture, the server checks the order with PayPal. That check needs `PAYPAL_CLIENT_SECRET` in the server environment. The secret is not in this repository. A confirmed order still does not add spendable money until a separate, labelled step posts it to the demo dollar pocket. The pocket is not a bank balance.

Webhook credits require `KUDI_WEBHOOK_SECRET`. Unsigned webhook calls are rejected.

## Run it

```bash
npm install
npm run dev
```

The app listens on port 8080. With no `DATABASE_URL`, it uses an embedded Postgres for accounts and the PayPal sandbox ledger. Wallet activity for sends, exchange, and airtime also stays in the browser for this demo.

## Stack

TanStack Start, React 19, Tailwind CSS, Better Auth, and Postgres.
