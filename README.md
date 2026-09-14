# Vit: Mute Bites — Campus Food Ordering & Unified Admin System

Vit: Mute Bites is structured as **2 DEDICATED FRONTEND APPLICATIONS** connected to **ONE central API & Neon PostgreSQL database**:

1. **Student Dining Portal** (`student-app/`): `http://localhost:5173`
2. **Unified Admin Portal** (`admin-app/`): `http://localhost:5174`
3. **Central Backend API**: `http://localhost:5000`

---

## 🚀 Quick Start (Local Development)

### 1. Run Everything Concurrently
```bash
npm run dev
```
This single command spins up the backend API, the Student Dining Portal, and the Unified Admin Portal concurrently!

### 2. Run Individual Applications
- **Student Dining Portal**: `npm run dev:student` (`http://localhost:5173`)
- **Vit: Mute Bites Admin Portal**: `npm run dev:admin` (`http://localhost:5174`)
- **Shared Backend API**: `npm run server` (`http://localhost:5000`)

---

## 🗄️ One-Click Supabase Database Setup

Both applications connect to the same Supabase project.

1. Create a free project at [Supabase](https://supabase.com/).
2. In your Supabase Dashboard, open the **SQL Editor**.
3. Open [`supabase/setup_all.sql`](./supabase/setup_all.sql) in this repository, copy its entire contents, and paste it into the Supabase SQL Editor.
4. Click **Run**.

### What `setup_all.sql` Sets Up:
- **Tables**:
  - `profiles`: Linked to `auth.users`, role = `'student'` or `'admin'`.
  - `restaurants`: Stores campus vendors and their `is_open` status.
  - `menu_items`: Dishes, categories, pricing, veg/non-veg tags.
  - `orders`: Confirmed student orders, amounts, delivery destinations.
  - `order_items`: Line-by-line dishes in each order.
  - `system_settings`: Master campus ordering switch (`ordering_enabled`).
- **Row Level Security (RLS)**:
  - Students can only view and create their own orders.
  - Admins can view all orders, delete orders, and toggle restaurant & system statuses.
- **Supabase Realtime**:
  - Automatic updates on `orders`, `restaurants`, and `system_settings`.
- **Seed Data**:
  - Pre-seeds *Local Home Kitchen* and *Campus Delight Kitchen* with their full menu items.

---

## 🔑 Environment Variables Configuration

In both `student-app/.env` and `admin-app/.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Note**: Both apps have a built-in **Local Preview / Demo Mode**. If Supabase keys are not set, you can still test the entire ordering and admin workflows with local state. As soon as you add your Supabase keys, both portals switch to live cloud database queries and real email OTPs!

---

## 📱 Website 1: Student Portal (`student-app`)

- **Authentication**: Supabase Auth Email OTP (`signInWithOtp` $\to$ `verifyOtp`).
- **Profile**: Automatically saved to `profiles` table with `role = 'student'`. Students cannot access the Admin portal.
- **Restaurant Selection**: Displays the 2 campus kitchens with real-time `OPEN / CLOSED` status from Supabase.
- **Food Menu**: Filter by categories (Biryani, Starters, Rice & Noodles, Curries, Thalis), live search, veg/non-veg markers, and interactive quantity steppers.
- **Cart & Checkout**: Slide-out cart, calculates ₹5 platform fee, free delivery, and captures hostel block & room number.
- **30-Second Order Confirmation**:
  - Displays *"You have 30 seconds to confirm your order."*
  - Animated visual circular countdown from 30s to 0.
  - **[ CONFIRM ORDER ]**: Generates order ID (`CB-XXXXXX`), saves order to Supabase with status `CONFIRMED`, triggers celebration confetti, and opens receipt.
  - **[ CANCEL ORDER ]**: Aborts order and sets status to `CANCELLED`.
  - **Timeout**: Automatically cancels order if timer reaches 0.
  - Duplicate prevention guard.
- **Order Success & Student Order History**:
  - Itemized digital receipt with estimated arrival time.
  - Student Order History strictly queries only orders belonging to the logged-in student (`user_id = auth.uid()`).

---

## 🛡️ Website 2: Admin Portal (`admin-app`)

- **Authentication**: Supabase Auth login with strict `role = 'admin'` verification. If a student tries to sign in, access is denied immediately with *"Unauthorized access."*
- **Dashboard Metrics**:
  - Total Orders, Confirmed Orders, Cancelled Orders, Active Vendors, Master System Status.
- **Master Ordering Switch**:
  - `ORDERING SYSTEM: 🟢 ON / [ TURN OFF ]`
  - Instantly toggles `system_settings.ordering_enabled`. When OFF, students can browse menus but cannot place new orders.
- **Individual Restaurant Controls**:
  - Dedicated `OPEN / CLOSED` toggle for each restaurant.
  - Updates `restaurants.is_open` in Supabase in real-time.
- **Real-time Student Orders Board**:
  - Incoming student orders appear automatically via Supabase Realtime without refreshing.
  - Displays: Order ID, Time, Student Name, Email, Student ID, Drop Location, Dishes, Total Amount, and Status.
  - **Actions**:
    - `[ Details ]`: Inspect full customer details and student cooking notes.
    - `[ CANCEL ORDER ]`: Marks status as `CANCELLED`.
    - `[ DELETE ORDER ]`: Displays confirmation modal before permanently removing the order from the database.

---

## 🌐 Vercel Independent Deployment

Deploying the two separate frontends on Vercel is straightforward:

### Deploy Student Portal (`student-app.vercel.app`)
1. Create a new project in Vercel from this repository.
2. In **Project Settings** → **General** → **Root Directory**, set to: `student-app`.
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Deploy Admin Portal (`admin-app.vercel.app`)
1. Create a second new project in Vercel from this same repository.
2. In **Project Settings** → **General** → **Root Directory**, set to: `admin-app`.
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!
