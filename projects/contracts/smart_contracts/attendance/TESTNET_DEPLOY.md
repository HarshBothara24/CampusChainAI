# CampusChain AI - TestNet Direct Deployment Guide

## 🚀 Quick TestNet Deployment (No LocalNet Required)

Since AlgoKit is not installed, we'll deploy directly to TestNet for the hackathon.

---

## Prerequisites

✅ Already installed:
- Python 3.10
- `pyteal`
- `py-algorand-sdk`
- `algokit_utils`

---

## Step 1: Get TestNet Account & ALGO

### Create Algorand Wallet

**Option A: Pera Wallet (Recommended)**
1. Download Pera Wallet: https://perawallet.app/
2. Create new account
3. Switch to TestNet in settings
4. Copy your wallet address

**Option B: Generate Account Programmatically**
```python
from algosdk import account, mnemonic

# Generate new account
private_key, address = account.generate_account()
mn = mnemonic.from_private_key(private_key)

print(f"Address: {address}")
print(f"Mnemonic: {mn}")
print("\n⚠️  SAVE THIS MNEMONIC SECURELY!")
```

### Fund Your TestNet Account

1. Visit: https://bank.testnet.algorand.network/
2. Enter your wallet address
3. Click "Dispense" to get 10 ALGO
4. Wait ~5 seconds for confirmation

---

## Step 2: Deploy Contract to TestNet

### Create Deployment Script

Save this as `deploy_testnet.py` in the attendance folder:

```python
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, OnComplete, StateSchema, wait_for_confirmation
import base64
from contract import get_approval_program, get_clear_program
from deploy_config import AttendanceDeployConfig

# TestNet Algod client
algod_address = "https://testnet-api.algonode.cloud"
algod_token = ""
algod_client = algod.AlgodClient(algod_token, algod_address)

# Your 25-word mnemonic (from Pera or generated)
DEPLOYER_MNEMONIC = input("Enter your 25-word mnemonic: ").strip()

# Convert to private key
deployer_private_key = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
deployer_address = account.address_from_private_key(deployer_private_key)

print(f"\\n📍 Deployer Address: {deployer_address}")

# Check balance
account_info = algod_client.account_info(deployer_address)
balance = account_info.get('amount') / 1_000_000
print(f"💰 Balance: {balance} ALGO")

if balance < 0.1:
    print("\\n❌ Insufficient balance!")
    print("Get TestNet ALGO: https://bank.testnet.algorand.network/")
    exit(1)

# Compile programs
print("\\n🔨 Compiling contract...")
approval_teal = get_approval_program()
clear_teal = get_clear_program()

approval_result = algod_client.compile(approval_teal)
clear_result = algod_client.compile(clear_teal)

approval_binary = base64.b64decode(approval_result['result'])
clear_binary = base64.b64decode(clear_result['result'])

print("✅ Contract compiled")

# Session details
session_id = input("\\nEnter session ID (e.g., CS101_2026_02_11): ").strip()
session_name = input("Enter session name (e.g., Computer Science 101): ").strip()
duration = int(input("Enter duration in seconds (default 3600): ").strip() or "3600")

# Create application
print("\\n🚀 Deploying to TestNet...")
params = algod_client.suggested_params()

app_args = [
    session_id.encode(),
    session_name.encode(),
    duration.to_bytes(8, 'big')
]

txn = ApplicationCreateTxn(
    sender=deployer_address,
    sp=params,
    on_complete=OnComplete.NoOpOC,
    approval_program=approval_binary,
    clear_program=clear_binary,
    global_schema=AttendanceDeployConfig.GLOBAL_SCHEMA,
    local_schema=AttendanceDeployConfig.LOCAL_SCHEMA,
    app_args=app_args
)

# Sign and send
signed_txn = txn.sign(deployer_private_key)
tx_id = algod_client.send_transaction(signed_txn)

print(f"📤 Transaction sent: {tx_id}")
print("⏳ Waiting for confirmation...")

# Wait for confirmation
result = wait_for_confirmation(algod_client, tx_id, 4)
app_id = result['application-index']

print("\\n" + "="*60)
print("🎉 DEPLOYMENT SUCCESSFUL!")
print("="*60)
print(f"Application ID: {app_id}")
print(f"Session ID: {session_id}")
print(f"Session Name: {session_name}")
print(f"\\n🔗 View on AlgoExplorer:")
print(f"https://testnet.algoexplorer.io/application/{app_id}")
print("\\n📝 Save this app_id for your frontend!")
```

### Run Deployment

```bash
cd projects/contracts/smart_contracts/attendance
python deploy_testnet.py
```

---

## Step 3: Verify Deployment

After deployment, visit the AlgoExplorer link to see your contract on-chain!

You should see:
- ✅ Application ID
- ✅ Global state with your session details
- ✅ Creator address

---

## Step 4: Test Attendance Marking

Create `test_mark_attendance.py`:

```python
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationOptInTxn, ApplicationNoOpTxn, wait_for_confirmation

# TestNet client
algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")

# Student account
student_mnemonic = input("Enter student 25-word mnemonic: ").strip()
student_private_key = mnemonic.to_private_key(student_mnemonic)
student_address = account.address_from_private_key(student_private_key)

# App details
app_id = int(input("Enter app_id from deployment: "))
session_id = input("Enter session_id: ").strip()

print(f"\\n👤 Student: {student_address}")

# Step 1: Opt-in
print("\\n[1/2] Opting in to app...")
params = algod_client.suggested_params()
opt_in_txn = ApplicationOptInTxn(
    sender=student_address,
    sp=params,
    index=app_id
)

signed = opt_in_txn.sign(student_private_key)
tx_id = algod_client.send_transaction(signed)
wait_for_confirmation(algod_client, tx_id, 4)
print("✅ Opted in")

# Step 2: Mark attendance
print("\\n[2/2] Marking attendance...")
params = algod_client.suggested_params()
mark_txn = ApplicationNoOpTxn(
    sender=student_address,
    sp=params,
    index=app_id,
    app_args=[b"mark_attendance", session_id.encode()]
)

signed = mark_txn.sign(student_private_key)
tx_id = algod_client.send_transaction(signed)
wait_for_confirmation(algod_client, tx_id, 4)

print("\\n🎉 ATTENDANCE MARKED!")
print(f"🔗 View transaction: https://testnet.algoexplorer.io/tx/{tx_id}")
```

---

## Next Steps After Deployment

1. ✅ Contract deployed to TestNet
2. ✅ Tested attendance marking
3. → Build frontend (Phase 2)
4. → Add AI service (Phase 3)
5. → NFT minting (Phase 4)

---

## Troubleshooting

### "Insufficient balance"
- Get more ALGO from faucet: https://bank.testnet.algorand.network/

### "Transaction rejected"
- Check if student has sufficient ALGO (need ~0.1 for fees)
- Verify session hasn't expired
- Confirm session_id matches exactly

### "Invalid mnemonic"
- Ensure it's exactly 25 words
- No extra spaces or line breaks

---

## For Hackathon: Skip to Frontend

Once deployed, you have a **working on-chain attendance system**! 

Focus on:
1. ✅ Smart contract on TestNet
2. → QR code generation
3. → Wallet integration
4. → Simple UI

**Working demo > Perfect demo**
