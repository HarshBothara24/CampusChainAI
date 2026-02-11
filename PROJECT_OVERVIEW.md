# CampusChain AI - Project Overview

CampusChain AI is a decentralized attendance management system built on the Algorand blockchain. It provides a secure, transparent, and tamper-proof way for educational institutions to track and verify student attendance using smart contracts.

## 🚀 Vision
To eliminate manual attendance tracking and fraud through a decentralized verification system that rewards consistency and ensures data integrity.

---

## 🏗️ Project Architecture

The project is divided into two main components:

### 1. Frontend (`/projects/frontend`)
A modern web application built with:
- **React + Vite**: Fast, modernized frontend development.
- **Tailwind CSS**: For a clean, professional UI.
- **Pera Wallet Integration**: Seamlessly connect and sign transactions using `@txnlab/use-wallet-react`.
- **Algokit Utils**: High-level library for Algorand blockchain interactions.

**Key Pages:**
- **Landing Page**: Introduction to the platform.
- **Teacher Dashboard**: For creating sessions and monitoring attendance.
- **Student Page**: For students to opt-in and mark their attendance.

### 2. Smart Contracts (`/projects/contracts`)
The backbone of the system, implementing the business logic on-chain:
- **PyTeal**: Python-based language for writing Algorand Smart Contracts.
- **Contract Features**:
  - **Multi-Teacher Support**: Admin can authorize multiple teachers to manage sessions.
  - **Session Management**: Teachers create unique attendance sessions with names and durations.
  - **Security**: Role-based access control (Admin, Teachers, Students).
  - **Tamper-Proof Tracking**: Attendance is recorded in student local states on the blockchain.
  - **Expiry Logic**: Sessions automatically expire based on the block timestamp.

---

## 🛠️ Technology Stack
- **Blockchain**: Algorand (TestNet)
- **Languages**: Python (Contracts), TypeScript/JavaScript (Frontend)
- **Libraries**: `algosdk`, `@algorandfoundation/algokit-utils`, `pyteal`
- **Wallet**: Pera Wallet

---

## 🔧 Current Development Status

### Completed:
- ✅ Basic smart contract implementation (`contract.py`)
- ✅ Multi-teacher authorization system
- ✅ Teacher management tools (`manage_teachers.py`)
- ✅ TestNet deployment environment setup
- ✅ Frontend UI for Teacher/Student dashboards
- ✅ Wallet connection logic
- ✅ Frontend service hook (`useAttendance.ts`) for contract calls

### In Progress:
- 🏗️ Refining the attendance marking flow (local state management)
- 🏗️ Enhancing UI aesthetics for a "premium" look
- 🏗️ Fine-tuning authorization logic

---

## 🆘 Troubleshooting: Smart Contract Authorization Fix Guide

### ✅ SOLUTION IMPLEMENTED: Multi-Teacher Support

The contract has been updated to support multiple authorized teachers! The authorization issue is now resolved.

### How It Works

**Authorization Hierarchy:**
- **Admin (Creator)**: The wallet that deploys the contract. Can authorize/remove teachers and create sessions.
- **Authorized Teachers**: Wallets granted permission by the admin. Can create and manage sessions.
- **Students**: Any wallet that opts in. Can mark attendance.

### For New Deployments

1. **Deploy the Contract**
   ```bash
   cd projects/contracts
   python smart_contracts/attendance/deploy_testnet.py
   ```
   - The deployer automatically becomes the admin
   - Admin has full teacher privileges

2. **Add Additional Teachers**
   ```bash
   python smart_contracts/attendance/manage_teachers.py
   ```
   - Teachers must opt-in first
   - Admin authorizes them using the management script

3. **Update Frontend**
   - Update `ATTENDANCE_APP_ID` in `projects/frontend/src/utils/algorand.ts`
   - Teachers can now create sessions with their own wallets

### For Existing Deployments

If you're using the old contract (App ID: `755361335`), you have two options:

#### Option A: Redeploy with Multi-Teacher Support (Recommended)
1. Deploy the updated contract with your admin wallet
2. Get the new App ID
3. Update frontend configuration
4. Authorize additional teachers as needed

#### Option B: Continue with Single Teacher
- Use the original deployment wallet
- Import that wallet's mnemonic into Pera Wallet
- Connect with that specific wallet

### Documentation

For detailed instructions, see:
- `projects/contracts/smart_contracts/attendance/MULTI_TEACHER_GUIDE.md`

---

## 📖 How to Run

### Frontend
```bash
cd projects/frontend
npm install
npm run dev
```

### Contracts (Deployment)
```bash
cd projects/contracts
# Ensure python is installed with pyteal and algosdk
python smart_contracts/attendance/deploy_testnet.py
```
