# Secure Attendance Implementation Guide

## Current Status

### ✅ Contract Updated
- Added `attendance_end_round` to global state
- Separate attendance window from session duration
- Contract validates attendance window (not just session duration)
- Schema updated: 5 uints (added attendance_end_round)

### ✅ Frontend Partially Updated
- TeacherDashboard has attendance window input (in minutes)
- `createSession` passes attendance window to contract
- `useAttendance` hook accepts attendance window parameter

### ❌ Not Yet Implemented
- SecureQRDisplay not integrated (needs student wallet address)
- StudentPage still uses old 2-arg `markAttendance`
- QR codes not wallet-bound yet

---

## What You Need to Do

### Step 1: Redeploy Contract

The contract code is updated but you need to deploy it:

```bash
cd projects/contracts
python smart_contracts/attendance/deploy_testnet.py
```

**Important**: When creating the session during deployment:
- Session duration: 3600 seconds (1 hour)
- Attendance window: 300 seconds (5 minutes) - **enter this when prompted**

After deployment:
1. Note the new App ID
2. Update `projects/frontend/src/utils/algorand.ts` with new App ID
3. Update `deployment_info.txt`

### Step 2: Test Attendance Window

After redeployment:

1. **Create a session** with:
   - Duration: 60 minutes (session lasts 1 hour)
   - Attendance Window: 5 minutes (students can only mark attendance in first 5 minutes)

2. **Test immediately**: Student should be able to mark attendance

3. **Wait 6 minutes**: Student should get error "attendance window closed"

---

## How It Works Now

### Teacher Creates Session:
```
Duration: 60 minutes → end_round = current_round + (3600/3) = current_round + 1200
Attendance Window: 5 minutes → attendance_end_round = current_round + (300/3) = current_round + 100
```

### Student Marks Attendance:
Contract checks:
1. `is_active == 1` ✅
2. `current_round <= attendance_end_round` ✅ (NOT end_round!)
3. Session ID matches ✅
4. Student hasn't checked in ✅
5. QR round valid (within 5 rounds) ✅
6. QR hash matches (wallet-bound) ✅

### After 5 Minutes:
- `current_round > attendance_end_round` ❌
- Student gets error: "attendance window closed"
- Session still active (can view, but can't mark attendance)

---

## Future: Full Secure QR Implementation

To implement wallet-bound QR codes (prevents sharing):

### Option A: Teacher Generates QR Per Student
1. Teacher enters student wallet addresses
2. System generates unique QR for each student
3. Each QR includes: `SHA256(session_id + round + student_address)`
4. Student scans their specific QR

### Option B: Dynamic QR Generation
1. Student scans generic QR with session info
2. Frontend generates wallet-bound hash client-side
3. Submits transaction with 4 args: `[session_id, qr_round, qr_hash, student_address]`

**Recommended**: Option B (easier, no pre-registration needed)

---

## Testing Checklist

After redeployment:

- [ ] Create session with 60min duration, 5min attendance window
- [ ] Student marks attendance immediately (should work)
- [ ] Wait 6 minutes
- [ ] Student tries to mark attendance (should fail with "attendance window closed")
- [ ] Session still shows as active
- [ ] Teacher can still view session details

---

## Current Limitations

1. **QR codes not wallet-bound yet** - Students can still share QR codes
2. **Old markAttendance** - Using 2-arg version (session_id only)
3. **No secure QR display** - Not generating wallet-bound hashes

These will be fixed in the next phase after testing the attendance window feature.

---

## Next Steps

1. **Deploy updated contract** ✅
2. **Test attendance window** ✅
3. **Implement secure QR** (Phase 2)
4. **Update StudentPage** (Phase 2)
5. **Full security testing** (Phase 2)

---

## Quick Deploy Command

```bash
cd projects/contracts
python smart_contracts/attendance/deploy_testnet.py
```

When prompted:
- Session ID: `Test_Session_001`
- Session Name: `Test Attendance Window`
- Duration: `3600` (1 hour)
- Attendance Window: `300` (5 minutes) ← **This is the key!**
