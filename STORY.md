# Kudi

## What inspired me

I kept coming back to the same gap. Apps like OPay and Moniepoint already taught a generation of Nigerians that sending money should feel as ordinary as sending a chat. You open the app, you see a balance, you tap a person, you type an amount, you confirm. The screen is orange, the cards are white, and the money language is plain.

What those apps do not do is sit inside the conversation where the request actually starts. Someone in Lagos tells Claude, "send ten dollars to Adaeze." Someone in Accra asks ChatGPT to turn naira into cedis before paying a customer. The assistant can talk about the payment. It cannot hold the wallet.

Kudi started as that missing wallet: a place where a sentence and a PayPal checkout can meet, for people moving between naira, cedis, shillings, and dollars. The visual language borrows the calm of a Moniepoint home screen on purpose. Familiar chrome, so the new part — saying the payment out loud — does not also have to teach a new layout.

The name is the point. Kudi is money, said the way people already say it.

## What I learned

A payment screen can look finished and still be a lie. The lesson that stuck was the difference between three states that are easy to collapse into one green tick:

1. PayPal has captured a sandbox order.
2. Our server has checked that order with PayPal.
3. A demo pocket shows the amount.

Those are not the same event. A browser can claim a capture. A webhook can arrive twice. A float can turn ₦10.10 into the wrong number of kobo. I stopped treating "the button returned success" as proof of anything.

I also learned that a public client id is not a secret, and a secret does not belong in a public hackathon repo. The checkout button needs the id. The confirmation needs the secret, and only the server should see it.

The last lesson was about voice. A local parser can understand "send $10 to Adaeze" or "buy 500 MTN airtime" without a model. A model is the fallback for the sentence the parser has not seen, not the thing that moves the money. The assistant proposes. The wallet, the PIN, and PayPal decide.

## How I built it

Kudi is a signed-in web app. Accounts are real: Google, X, or email and password, stored in Postgres (an embedded Postgres when no hosted database is configured). The interface is React on TanStack Start. The home screen is a dollar hero, four pockets, and four actions: Add, Send, Receive, Exchange. Naira, cedi, shilling, and dollar balances sit on one ledger. Airtime (MTN, Airtel, Glo, 9mobile) spends from the naira pocket. Larger payments ask for a PIN. The demo PIN starts at `1234`.

Talk-to-pay is the same action model as the buttons. A sentence becomes a draft — who, which currency, how much — and the draft goes through the same review the taps would have used. The same draft can be pasted in from ChatGPT or Claude as a block. Contacts such as Adaeze, Chidi, Mama, Amina, Kwame, and Zuri are the people the sentence is allowed to name.

Dollars are bought through PayPal's JavaScript SDK against the sandbox, so the order is a real sandbox order. After the buyer approves it, the server asks PayPal, with the secret, whether that order is `COMPLETED` and whether the dollar amount matches. Only then can a separate, labelled step post the figure into the demo pocket. The pocket is not a bank balance. Unsigned webhook calls are rejected.

Every currency is stored as an integer number of minor units, hundredths of the major unit, so naira and dollars share one rule:

\[
\text{minor} = \operatorname{round}(\text{major} \times 100)
\]

Exchange is a labelled demo cross-rate through dollars, not a live market. With \(r_c\) as major units of currency \(c\) per one US dollar (\(r_{\mathrm{NGN}} = 1550\), \(r_{\mathrm{GHS}} = 15.4\), \(r_{\mathrm{KES}} = 129\), \(r_{\mathrm{USD}} = 1\)):

\[
\text{minor}_{to} = \operatorname{round}\!\left(\frac{\text{minor}_{from}}{100 \cdot r_{from}} \cdot r_{to} \cdot 100\right)
\]

So ten dollars quoted into naira is

\[
10 \times 1550 = 15500
\]

and the review line reads "1 USD = ₦1,550.00". The rate is shown before anyone confirms. The demo exchange fee is zero, and it is labelled as a demo.

AI showed up in two places, and I want that on the record. I built the app with Grok. Inside the product, Grok is only the fallback when the local phrase parser does not already understand the request. It cannot post a ledger entry by itself.

## Challenges

The first challenge was honesty about scope. A hackathon wallet that pretends to deliver naira to a real bank account is worse than a small one that says what is real. PayPal checkout is a real sandbox capture. Kudi-to-Kudi sends, airtime, and the exchange rate are a demo. Phone numbers are not treated as verified. I would rather show "not verified" than invent an OTP.

The second was the replay. One captured PayPal order must not fund two pockets, and a second tap must not insert a second ledger row. The payment row and the ledger row are separate, and the ledger insert is keyed so the same PayPal order cannot be posted twice. The amount the browser reports is ignored unless PayPal's own order object carries the same number of cents.

The third was the rate people actually read. An early quote ran in the direction that is natural for the formula and backwards for a person. "₦1,550 = 1 USD" is how the division falls out. "1 USD = ₦1,550.00" is how someone decides. The math stayed a cross through dollars. The sentence flipped.

The fourth was getting the work into a public repository at all, which the hackathon requires, without dragging the PayPal secret or local screenshots in with it. The client id can live in the browser. The secret stays in the server environment. That split took longer than the button did.

What I would do next is the part this demo refuses to fake: a verified webhook as the only writer of spendable funds, live rates with a visible spread, and payouts that leave the demo pocket for a real rail. The shape is already there. The promise is not.
