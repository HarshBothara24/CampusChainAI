# CampusChain AI - Quick Start Guide

## 🚀 Phase 1 Complete: Smart Contract Ready!

Your attendance smart contract is now ready for deployment.

---

## 📁 What Was Created

```
projects/contracts/smart_contracts/attendance/
├── contract.py           # PyTeal smart contract
├── deploy_config.py      # Deployment configuration
├── deploy.py            # Interactive deployment script
├── __init__.py          # Package initialization
└── README.md            # Full documentation

projects/contracts/tests/
└── test_attendance.py   # Test suite
```

---

## ✅ Contract Features

- **Session Management**: Create and manage attendance sessions
- **Duplicate Prevention**: Students can only check in once per session
- **Time Expiry**: Sessions automatically expire after duration
- **On-Chain Verification**: All attendance records are immutable
- **Privacy-Preserving**: Only wallet addresses stored (no personal data)

---

## 🎯 Next Steps: Deploy to LocalNet

### Option 1: Interactive Deployment (Recommended)

```bash
cd projects/contracts/smart_contracts/attendance
python deploy.py
```

Follow the prompts:
1. Select network: `localnet`
2. Enter session ID: `CS101_2026_02_11`
3. Enter session name: `Computer Science 101`
4. Enter duration: `3600` (1 hour)

### Option 2: Manual Deployment

```bash
# 1. Start LocalNet (requires Docker)
algokit localnet start

# 2. Compile contract
cd projects/contracts/smart_contracts/attendance
python contract.py > approval.teal

# 3. Use AlgoKit to deploy
algokit project deploy localnet
```

---

## 🧪 Testing

```bash
# Run test suite (requires LocalNet running)
cd projects/contracts
pytest tests/test_attendance.py -v
```

---

## 📊 Contract State Schema

### Global State (Session Level)
| Key | Type | Description |
|-----|------|-------------|
| `session_id` | Bytes | Unique identifier |
| `session_name` | Bytes | Human-readable name |
| `creator` | Bytes | Teacher's wallet |
| `start_time` | Int | Start timestamp |
| `end_time` | Int | Expiry timestamp |
| `is_active` | Int | Status (1/0) |
| `total_attendance` | Int | Student count |

### Local State (Per Student)
| Key | Type | Description |
|-----|------|-------------|
| `checked_in` | Int | Present (1/0) |
| `check_in_time` | Int | Timestamp |

---

## 🔧 Troubleshooting

### "Docker not running"
```bash
# Start Docker Desktop, then:
algokit localnet start
```

### "Module not found: pyteal"
```bash
pip install pyteal py-algorand-sdk
```

### "Connection refused"
```bash
# Verify LocalNet is running:
algokit localnet status

# If not running:
algokit localnet start
```

---

## 📝 What's Next?

After successful LocalNet deployment:

1. **Phase 2**: Build QR + Wallet frontend
   - Teacher creates session → generates QR
   - Student scans → wallet signs → attendance recorded

2. **Phase 3**: Add AI proxy detection
   - Python FastAPI service
   - Isolation Forest anomaly detection
   - Risk scoring endpoint

3. **Phase 4**: NFT certificate minting
   - Algorand ASA creation
   - IPFS metadata storage
   - Automatic minting on verified attendance

---

## 🎓 Contract Methods

### For Teachers (Contract Creator)

**Create Session**:
```python
app_args = ["create_session", session_id, session_name, duration]
```

**Close Session**:
```python
app_args = ["close_session"]
```

### For Students

**Opt-In** (required once):
```python
ApplicationOptInTxn(sender=student_address, index=app_id)
```

**Mark Attendance**:
```python
app_args = ["mark_attendance", session_id]
```

---

## 🌐 Deploy to TestNet

After LocalNet testing works:

```bash
# 1. Get TestNet ALGO
# Visit: https://bank.testnet.algorand.network/

# 2. Run deployment script
cd projects/contracts/smart_contracts/attendance
python deploy.py

# 3. Select network: testnet
# 4. Enter your 25-word mnemonic
```

---

## 📚 Full Documentation

See [attendance/README.md](file:///d:/Hackathon/Hackspiration26/CampusChain-AI/projects/contracts/smart_contracts/attendance/README.md) for complete details.

---

## ⚡ Hackathon Priority

**WORKING CORE > CLEAN DEMO**

Focus order:
1. ✅ Smart contract works
2. ⏳ Deploy to TestNet  
3. ⏳ Wallet signing works
4. ⏳ Attendance visible on-chain
5. ⏳ Basic AI scoring
6. ⏳ NFT minting

**You are here**: Ready to deploy! 🎉
