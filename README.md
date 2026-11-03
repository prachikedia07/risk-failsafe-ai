# RiskFailsafe AI

A payment fraud detection project that spots unusual transaction activity and uses an AI agent to explain why it looks suspicious and recommend actions.

> 🚧 This is a learning project and I'm still improving it. **Suggestions, feedback and ideas are very welcome!** Feel free to open an issue or reach out.

## Why I built this

Fraud is easy to miss until the damage is done. Things like a sudden jump in failed payments, odd transaction amounts, or lots of activity from brand-new accounts can be early warning signs.

I wanted to understand how fraud detection actually works: how raw transactions turn into useful signals, how "unusual" is measured against normal behaviour, and how an AI agent can help investigate what gets flagged.

## How it works

**1. Payments come in**
Payments are made through Razorpay (Test Mode). The backend listens to Razorpay webhooks, so payment status comes from verified server events and not just the frontend.

**2. Features are extracted**
From the transactions, the system calculates things like transaction count, average amount, failure rate, transactions per minute, and how many customers are new (account created in the last 24 hours).

**3. Risk engine scores it (no LLM here)**
The engine builds a baseline from normal activity, then checks how far the current activity is from that baseline using a Z-score. Four signals are combined into a score from 0 to 100:

| Signal | Weight |
|---|---|
| Transaction velocity | 30% |
| Average amount | 25% |
| Failure rate | 25% |
| New customer ratio | 20% |

A score of **50 or above is marked SUSPICIOUS**, anything below is NORMAL.

**4. AI agent investigates**
For flagged cases, an LLM agent (Gemini, with Groq as backup) looks at the merchant's recent transactions, baseline and risk signals. It gives a summary, reasons, a confidence score and one recommendation: `ALLOW`, `REVIEW` or `PAUSE`.

The LLM only helps explain and decide next steps. The actual detection is done by the statistical engine.

## Results

I tested the engine on a synthetic dataset of 1,000 scenarios. 800 were used to build the baseline and 200 were kept aside as a held-out test set.

| Metric | Result |
|---|---|
| Accuracy | 98.5% |
| Precision | 95.24% |
| Recall | 100% |
| F1-score | 97.56% |

Out of 200 test cases: all 60 suspicious ones were caught, and 3 normal ones were wrongly flagged.

⚠️ **These numbers are on synthetic data I generated myself, so they don't show how it would perform on real fraud.**

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (Neon), Prisma
- **Payments:** Razorpay Test Mode + Webhooks
- **AI:** Google Gemini, Groq

## Dashboard

- **Overview:** transaction stats and recent alerts
- **Transactions:** all saved payments and their status
- **Risk Alerts:** investigations and recommendations
- **Evaluation:** test metrics and confusion matrix
- **Test Payments:** try the Razorpay test checkout

## Run it locally

You'll need Node.js, a PostgreSQL database, a Razorpay Test Mode account, and Gemini + Groq API keys.

```bash
# Backend
cd backend
npm install
# add your environment variables in backend/.env
npm run dev

# Frontend (in a new terminal)
cd frontend
npm install
# add your environment variables in frontend/.env.local
npm run dev
```

The frontend runs at `http://localhost:3000`.

To generate data and run the evaluation (from `backend/`):

```bash
npm run generate:data     # create synthetic scenarios
npm run extract:features  # extract features
npm run evaluate:risk     # evaluate the risk engine
npm run analyze:risk      # run a stored risk analysis
```

Reports are saved in `backend/data/evaluation-results/`.

## Limitations

- Evaluation uses synthetic data only
- The risk engine is statistical and threshold-based, not a trained ML model
- The AI agent's output is a recommendation, not verified truth
- Not production-ready: it needs real data, better tuning and more testing

## What's next

I'm still refining this, so if you have thoughts on the risk scoring, the evaluation, the code structure, or anything else, I'd love to hear them. Issues and PRs are open.
