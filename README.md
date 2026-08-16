# Restaurant POS SaaS

Commercial Multi-Tenant Restaurant POS. Backend: NestJS + Prisma + PostgreSQL.

## Setup
1. npm install
2. docker compose up -d postgres   (or use Neon DATABASE_URL)
3. cp .env.example packages/backend/.env  (already done; edit secrets)
4. npm run migrate
5. npm run seed
6. npm run dev
7. npm test

## Default dev accounts (DEVELOPMENT ONLY)
- superadmin / SuperAdmin@2024!
- admin_demo / Admin@1234
- cashier_demo / Cashier@1234

WARNING: change all secrets and passwords in production via env vars.
