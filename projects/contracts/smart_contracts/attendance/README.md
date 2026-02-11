# Attendance Smart Contract

## Overview

Decentralized attendance tracking system built with PyTeal for Algorand blockchain.

**Key Features**:
- ✅ Session creation and management
- ✅ Duplicate attendance prevention
- ✅ Time-based session expiry
- ✅ On-chain verification
- ✅ Privacy-preserving (only wallet addresses stored)

---

## Contract Architecture

### Global State (Session Level)

| Key | Type | Description |
|-----|------|-------------|
| `session_id` | Bytes | Unique session identifier |
| `session_name` | Bytes | Human-readable session name |
| `creator` | Bytes | Teacher's wallet address |
| `start_time` | Int | Session start timestamp |
| `end_time` | Int | Session expiry timestamp |
| `is_active` | Int | Session status (1=active, 0=closed) |
| `total_attendance` | Int | Count of students checked in |

### Local State (Per Student)

| Key | Type | Description |
|-----|------|-------------|
| `checked_in` | Int | Attendance status (1=present, 0=absent) |
| `check_in_time` | Int | Timestamp of attendance |

---

## Methods

### 1. Create Session
**Caller**: Teacher (contract creator)  
**Args**: `["create_session", session_id, session_name, duration]`

Creates a new attendance session with specified duration.

### 2. Mark Attendance
**Caller**: Student  
**Args**: `["mark_attendance", session_id]`

Records student attendance. Prevents duplicates and validates session is active.

### 3. Close Session
**Caller**: Teacher (contract creator)  
**Args**: `["close_session"]`

Manually closes the attendance session.

### 4. Opt-In
**Caller**: Student  
**Args**: None (OnComplete.OptIn)

Required before marking attendance. Initializes local state.

---

## Deployment Instructions

### Prerequisites

```bash
# Install dependencies
pip install pyteal py-algorand-sdk

# Start LocalNet (requires Docker)
algokit localnet start
```

### Step 1: Compile Contract

```bash
cd projects/contracts/smart_contracts/attendance
python contract.py > compiled_approval.teal
```

### Step 2: Deploy to LocalNet

```python
from algosdk.v2client import algod
from deploy_config import AttendanceDeployConfig
from contract import get_approval_program, get_clear_program

# Connect to LocalNet
client = AttendanceDeployConfig.get_algod_client("localnet")

# Compile programs
approval_teal = get_approval_program()
clear_teal = get_clear_program()

# Deploy (requires funded account)
app_id = AttendanceDeployConfig.deploy_contract(
    algod_client=client,
    creator_private_key="YOUR_PRIVATE_KEY",
    approval_program_compiled=approval_teal,
    clear_program_compiled=clear_teal,
    session_id="CS101_2026_02_11",
    session_name="Computer Science 101 - Feb 11",
    duration_seconds=3600  # 1 hour
)
```

### Step 3: Test Attendance Flow

```python
from algosdk.transaction import ApplicationOptInTxn, ApplicationNoOpTxn

# Student opts in
opt_in_txn = ApplicationOptInTxn(
    sender=student_address,
    sp=params,
    index=app_id
)

# Student marks attendance
mark_txn = ApplicationNoOpTxn(
    sender=student_address,
    sp=params,
    index=app_id,
    app_args=["mark_attendance", "CS101_2026_02_11"]
)
```

---

## Security Features

1. **Duplicate Prevention**: Local state ensures each student can only check in once
2. **Time Validation**: Sessions automatically expire after duration
3. **Creator Authorization**: Only contract creator can create/close sessions
4. **Privacy**: No personal data stored, only wallet addresses
5. **Immutable Records**: Attendance records are permanent on-chain

---

## Testing

### Unit Tests

```bash
cd projects/contracts
pytest tests/test_attendance.py -v
```

### Manual Testing with AlgoKit

```bash
# Create session
algokit task send-transaction \
  --app-id <APP_ID> \
  --method create_session \
  --args "CS101_Session1" "Intro to Algorithms" 3600

# Mark attendance
algokit task send-transaction \
  --app-id <APP_ID> \
  --method mark_attendance \
  --args "CS101_Session1"

# Read state
algokit task inspect-state --app-id <APP_ID>
```

---

## TestNet Deployment

```bash
# Generate TestNet config
algokit generate env-file -a target_network testnet

# Add your mnemonic to .env.testnet
# DEPLOYER_MNEMONIC="your 25-word mnemonic"

# Get TestNet ALGO
# Visit: https://bank.testnet.algorand.network/

# Deploy
python deploy_config.py --network testnet
```

---

## Integration with Frontend

See Phase 2 for QR code generation and wallet integration.

**Key Integration Points**:
1. Generate QR with `session_id` and `app_id`
2. Student scans QR and connects wallet (Pera/AlgoSigner)
3. Frontend constructs `mark_attendance` transaction
4. Wallet signs and submits to blockchain
5. Frontend queries contract state for confirmation

---

## Troubleshooting

### "Logic error: assert failed"
- Check if student already opted in
- Verify session is still active
- Confirm session_id matches

### "Transaction rejected"
- Ensure student has opted into the app
- Check if session has expired
- Verify sufficient ALGO balance for fees

### "Invalid state schema"
- Verify global/local schema matches contract
- Check state key names are correct

---

## Next Steps

- [ ] Deploy to LocalNet
- [ ] Test all methods
- [ ] Deploy to TestNet
- [ ] Build frontend integration (Phase 2)
- [ ] Add AI risk scoring (Phase 3)
- [ ] Implement NFT minting (Phase 4)
