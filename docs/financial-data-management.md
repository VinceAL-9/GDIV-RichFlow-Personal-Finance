
# RichFlow Financial Data Management

**Project:** RichFlow - Personal Finance Management Application  
**Last Updated:** November 11, 2025  
**Status:** Core Features Implemented


## Table of Contents

1. [Overview](#overview)
2. [Data Models & Schema](#data-models--schema)
3. [Architecture](#architecture)
4. [API Endpoints](#api-endpoints)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Data Flow Examples](#data-flow-examples)
8. [Security Considerations](#security-considerations)
9. [Contributors](#contributors)
10. [Changelog](#changelog)

---

## Overview

This document details the core financial data management features of the RichFlow application. These features empower users to dynamically track their financial activities by managing their income, expenses, and cash savings. This functionality is central to building the user's income statement and providing a clear, real-time view of their financial health.

### Key Features

- **Income Management**: Add, update, and delete income lines, categorized by type (Earned, Portfolio, Passive).
- **Expense Management**: Add, update, and delete expense entries.
- **Cash Savings**: View and modify the total cash savings amount.
- **Data Persistence**: All financial data is securely stored and associated with the authenticated user.
- **Real-time Updates**: The frontend reflects data changes immediately after an operation is performed.

---

## Data Models & Schema

The financial data is structured across several related models in the Prisma schema to ensure data integrity and scalability.

### IncomeStatement Model

**Purpose:** A container for a user's income and expense records, forming the basis of their income statement.

**Fields:**
- `id` (Int, Primary Key, Auto-increment)
- `userId` (Int, Foreign Key) - Links to the `User` model.

**Relations:**
- One-to-Many with `IncomeLine`
- One-to-Many with `Expense`

---

### IncomeLine Model

**Purpose:** Represents a single line of income for a user.

**Fields:**
- `id` (Int, Primary Key, Auto-increment)
- `name` (String) - The source of the income (e.g., "Monthly Salary").
- `amount` (Float) - The monetary value of the income.
- `type` (String) - The category of income (`EARNED`, `PORTFOLIO`, `PASSIVE`).
- `isId` (Int, Foreign Key) - Links to the `IncomeStatement` model.

---

### Expense Model

**Purpose:** Represents a single expense for a user.

**Fields:**
- `id` (Int, Primary Key, Auto-increment)
- `name` (String) - The description of the expense (e.g., "Groceries").
- `amount` (Float) - The monetary value of the expense.
- `isId` (Int, Foreign Key) - Links to the `IncomeStatement` model.

---

### CashSavings Model

**Purpose:** Tracks the total amount of cash or cash equivalents a user has saved.

**Fields:**
- `id` (Int, Primary Key, Auto-increment)
- `amount` (Float) - The total cash savings amount.
- `userId` (Int, Unique, Foreign Key) - Ensures one `CashSavings` record per user.

---

## Architecture

The financial data management system follows a standard client-server architecture, with the React frontend communicating with the Node.js/Express backend via a RESTful API.

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Dashboard Page                                        │ │
│  │   - IncomeSection Component                           │ │
│  │   - ExpensesSection Component                         │ │
│  │   - SummarySection (displays Cash Savings)            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  State Management (Zustand, Context)                   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Utility (api.ts)                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS (Authenticated API Calls)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                       Backend API                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Routes: /api/income, /api/expenses, /api/cash-savings │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Controllers & Services for each resource              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Middleware: Authentication, Validation                │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Tables: IncomeLine, Expense, CashSavings, etc.        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

All financial data endpoints are protected and require user authentication. The system uses the `userId` from the JWT payload to ensure users can only access their own data.

### Income API

- **`GET /api/income`**: Fetches all income lines for the authenticated user.
- **`POST /api/income`**: Adds a new income line.
  - **Body**: `{ "name": "string", "amount": "number", "type": "string" }`
- **`PUT /api/income/:id`**: Updates an existing income line.
  - **Body**: `{ "name": "string", "amount": "number", "type": "string" }`
- **`DELETE /api/income/:id`**: Deletes an income line.

### Expenses API

- **`GET /api/expenses`**: Fetches all expenses for the authenticated user.
- **`POST /api/expenses`**: Adds a new expense.
  - **Body**: `{ "name": "string", "amount": "number" }`
- **`PUT /api/expenses/:id`**: Updates an existing expense.
  - **Body**: `{ "name": "string", "amount": "number" }`
- **`DELETE /api/expenses/:id`**: Deletes an expense.

### Cash Savings API

- **`GET /api/cash-savings`**: Fetches the cash savings amount for the authenticated user.
- **`PUT /api/cash-savings`**: Updates the cash savings amount.
  - **Body**: `{ "amount": "number" }`

---

## Backend Implementation

The backend logic is modular, with dedicated controllers, services, and routes for each financial resource.

### Directory Structure

```
backend/src/
├── controllers/
│   ├── income.controller.ts
│   ├── expense.controller.ts
│   └── cashSavings.controller.ts
│
├── services/
│   ├── income.service.ts
│   ├── expense.service.ts
│   └── cashSavings.service.ts
│
└── routes/
    ├── income.routes.ts
    ├── expense.routes.ts
    └── cashSavings.routes.ts
```

### Service Logic (`*.service.ts`)

- **Ownership Check**: Every database query (`find`, `update`, `delete`) is scoped to the `userId` to prevent unauthorized data access.
- **Data Validation**: Services ensure that amounts are positive numbers and that income types are valid.
- **Associated Records**: When a user is created, corresponding `IncomeStatement`, `BalanceSheet`, and `CashSavings` records are automatically generated for them.

---

## Frontend Implementation

The frontend uses React components and state management stores to provide a seamless user experience for managing financial data.

### Directory Structure

```
frontend/src/
├── components/
│   ├── IncomeSection/
│   │   └── IncomeSection.tsx
│   ├── ExpensesSection/
│   │   └── ExpensesSection.tsx
│   └── SummarySection/
│       └── SummarySection.tsx
│
├── hooks/
│   ├── useIncomes.ts
│   └── useExpenses.ts
│
├── state/
│   ├── incomeTotalsStore.ts
│   └── cashSavingsStore.ts
│
└── utils/
    └── api.ts
```

### Key Components

- **`IncomeSection.tsx`**: Displays income lines grouped by type. Contains forms for adding new income and buttons for editing/deleting existing entries.
- **`ExpensesSection.tsx`**: Displays a list of expenses. Contains a form for adding new expenses and controls for managing them.
- **`SummarySection.tsx`**: Displays the user's total cash savings and provides an interface to update it.

### State Management

- **Zustand/Context API**: Global stores are used to manage the state of income, expenses, and cash savings across the application.
- **`useIncomes` / `useExpenses` Hooks**: Custom hooks abstract the logic for fetching, adding, updating, and deleting financial data, handling API calls, and managing loading/error states.

---

## Data Flow Examples

### Adding a New Income Line

1.  **User**: Fills out the "Add Income" form in the `IncomeSection` component and clicks "Add".
2.  **Frontend**: The component's event handler calls the `addIncomeLine` function from the `useIncomes` hook.
3.  **API Utility**: An authenticated `POST` request is sent to `/api/income` with the new income data.
4.  **Backend**:
    - The `auth.middleware` verifies the user's JWT.
    - The `income.controller` handles the request.
    - The `income.service` creates a new `IncomeLine` record in the database, associated with the user's `IncomeStatement`.
5.  **Response**: The backend returns the newly created income object.
6.  **Frontend**: The state management store is updated with the new income line, and the UI re-renders to display it.

---

## Security Considerations

- **Data Ownership**: The primary security mechanism is ensuring that all database queries are strictly scoped by the `userId` obtained from the authenticated session. This prevents one user from ever seeing or modifying another user's financial data.
- **Input Validation**: Both client-side and server-side validation are in place to ensure data integrity. Amounts are checked to be valid numbers, and text inputs are sanitized.
- **Authentication**: All API endpoints for financial data are protected by the `auth.middleware`, which rejects any request without a valid JWT.

---

## Contributors

- **Core Financial Data Management Logic and APIs**: Lance Demonteverde, Gian Umadhay
- **Summary Section Calculations and Visualization**: Paolo Quimpo, Lance Demonterverde
- **Database Schema Updates**: Vince Latabe
- **Dashboard Sidebar UI Design**: Red Guilaran, Johan Oquendo
- **Optimized Log Out and Sign Up**: Vince Latabe
- **Code Cleanup/Organization and Documentation**: Vince Latabe 

---

## Changelog

**Document Version:** 1.0  
**Last Updated:** November 11, 2025

### Changes
- Initial documentation for financial data management features.
- Detailed API endpoints, data models, and architecture.
- Outlined security considerations and future development plans.
