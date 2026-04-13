# Frontend Integration Guide

This guide provides everything you need to build a high-performance, type-safe frontend for your Film Equipment Tracker.

**API Base URL**: `https://wheresmystuff.thomas-abadines.workers.dev`

---

## ⚡ Type-Safe Integration (Recommended)

Since your API is built with Hono, you can use **Hono RPC** to share types directly with your frontend. This gives you full autocomplete and type-checking for every API request.

### 1. Export the App Type
In your backend `src/index.ts`, ensure the app is exported as a type:
```typescript
// backend/src/index.ts
const app = new Hono<{ Bindings: Bindings }>();
// ... routes ...
export type AppType = typeof app;
export default app;
```

### 2. Use the Client in your Frontend
Install `hono`: `npm install hono`
```typescript
import { hc } from 'hono/client';
import type { AppType } from '../../backend/src/index'; // Adjust path

const client = hc<AppType>('https://wheresmystuff.thomas-abadines.workers.dev');

// Usage (Full autocomplete!)
const res = await client.equipment.$get({ query: { status: 'available' } });
const gear = await res.json();
```

---

## 📖 API Reference

### 👤 Users
| Method | Path | Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | - | List all users |
| `POST` | `/users` | `{ name: string, role: 'admin'\|'member' }` | Create a new user |

### 🎥 Equipment
| Method | Path | Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/equipment` | - | List gear. Query: `?status=available&owner_id=UUID` |
| `POST` | `/equipment` | `{ name: string, owner_id: string }` | Register new gear |
| `GET` | `/equipment/:id`| - | Get specific gear details |

### 📦 Kits
| Method | Path | Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/kits` | - | List all kits |
| `POST` | `/kits` | `{ name: string, owner_id: string }` | Create a new kit |
| `GET` | `/kits/:id` | - | Get kit + its equipment items |
| `POST` | `/kits/:id/items`| `{ equipment_ids: string[] }` | Add items to a kit |

### 🤝 Loans
| Method | Path | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/loans` | `{ borrower_id, lender_id, equipment_ids: [] }` | Checkout items |
| `POST` | `/loans/:id/return`| `{ lender_id: string }` | Mark loan as returned |

### 📜 Audit Logs
| Method | Path | Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/audit` | - | List all system activities |

---

## 🎨 Recommended UI Architecture

### 1. Dashboard (The Overview)
- **Top Stats**: Active loans, Available gear, Total members.
- **Quick Actions**: "New Loan", "Register Gear".

### 2. Inventory Management
- **Table/Grid Viewer**: Display gear with status badges (Green = Available, Red = Checked Out).
- **Filtering**: Quick tabs for "All", "Available", "In Use".

### 3. Equipment Lifecycle
- **Kit View**: A dedicated page for Kits that shows which items are inside.
- **Loan Detail**: A view for each loan showing who has the items and when they were taken.

### 4. Audit Trail Viewer
- A searchable list of all system actions. Highly recommended for troubleshooting and historical tracking.

---

## 🛠️ Tech Stack Suggestions

- **Next.js (App Router)**: Great for SEO and built-in API routing. 
- **Tailwind CSS**: For rapid, consistent styling.
- **TanStack Query (React Query)**: Highly recommended for managing the API state, caching, and loading indicators.
