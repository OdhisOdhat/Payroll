# PayrollPro Kenya 🇰🇪

An advanced, AI-powered Payroll Management System tailored for the Kenyan statutory environment (2024/2025 regulations).

## 🚀 Features

- **Statutory Compliance**: Automated calculation of:
  - **PAYE**: Based on the latest tiered tax brackets.
  - **SHA (Social Health Authority)**: Calculated at 2.75% of Gross Salary.
  - **NSSF**: Tier I and Tier II contributions.
  - **Affordable Housing Levy**: 1.5% of Gross Salary.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full control over personnel onboarding, monthly payroll execution, and system overrides.
  - **Authorized Tax Officer**: Access to compliance reports, audit trails, and tax logic verification.
  - **Staff**: Secure portal to view personal payslips and download annual P9 forms.
- **AI-Powered Insights**: Integration with Gemini API to explain tax deductions and provide financial advice to employees.
- **Document Generation**: High-fidelity Payslips and P9 Forms ready for printing or PDF export.
- **Hybrid Storage**: Real-time synchronization with **Turso (SQLite)** with local-first fallback capabilities.

## 🛠 Tech Stack

- **Frontend**: React (v19), Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express.
- **Database**: Supabase (Postgresql) (LibSQL/SQLite).
- **AI**: Google Gemini (via `@google/genai`).
- **Module Management**: Native ESM with Import Maps.

## 📦 Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd payroll-pro-kenya
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file and add your keys:
   ```env
   API_KEY=your_gemini_api_key
   TURSO_URL=your_turso_db_url
   TURSO_AUTH_TOKEN=your_turso_token
   ```

4. **Run the Application**:
   - Start Backend: `npm run server`
   - Start Frontend: Open `index.html` via a local dev server (e.g., Live Server).

## ⚖️ Statutory Logic (2024)

This application strictly follows the Kenyan Finance Act guidelines.
- **Personal Relief**: KES 2,400 per month.
- **Insurance Relief**: Calculated where applicable.
- **NITA Levy**: Tracked as an employer liability.

## 📝 License

Proprietary. All rights reserved.
