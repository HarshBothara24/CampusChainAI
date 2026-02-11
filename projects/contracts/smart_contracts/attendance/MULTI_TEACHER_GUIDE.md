# Multi-Teacher Support Guide

## Overview

The updated CampusChain AI contract now supports multiple authorized teachers. This allows institutions to have several teachers managing attendance sessions without requiring separate contract deployments.

## Key Changes

### 1. Authorization Model
- **Before**: Only the contract creator could create sessions
- **After**: The creator (admin) can authorize multiple teachers who can all create sessions

### 2. Local State Schema
The local state now includes an additional field:
- `is_teacher` (Int): Authorization flag (1=authorized, 0=not authorized)

This means the local state now uses 3 uint slots instead of 2.

### 3. New Methods

#### `add_teacher`
Grants teacher privileges to a wallet address.
- **Authorization**: Only contract creator (admin)
- **Arguments**: Teacher address in accounts array
- **Prerequisite**: Teacher must opt-in to the app first

#### `remove_teacher`
Revokes teacher privileges from a wallet address.
- **Authorization**: Only contract creator (admin)
- **Arguments**: Teacher address in accounts array

## Deployment Process

### Step 1: Deploy the Updated Contract

```bash
cd projects/contracts
python smart_contracts/attendance/deploy_testnet.py
```

When prompted:
1. Choose option 1 (existing mnemonic) or 2 (new account)
2. Enter your admin wallet mnemonic
3. Configure the initial session
4. Save the new Application ID

### Step 2: Update Frontend Configuration

Update `projects/frontend/src/utils/algorand.ts`:

```typescript
export const ATTENDANCE_APP_ID = YOUR_NEW_APP_ID;
```

### Step 3: Add Teachers

#### Option A: Using the Management Script (Recommended)

```bash
cd projects/contracts
python smart_contracts/attendance/manage_teachers.py
```

Follow the prompts:
1. Enter admin mnemonic
2. Enter Application ID
3. Choose "Add Teacher"
4. Enter teacher wallet address

#### Option B: Using Frontend (Future Enhancement)

The frontend can be extended with an admin panel to manage teachers through the UI.

## Teacher Workflow

### For New Teachers

1. **Opt-in to the App**
   - Visit the student page
   - Connect your wallet
   - Enter the App ID
   - Complete the opt-in transaction

2. **Wait for Authorization**
   - Admin must run `add_teacher` with your wallet address
   - You'll receive confirmation when authorized

3. **Create Sessions**
   - Visit the teacher dashboard
   - Connect your authorized wallet
   - Create attendance sessions as normal

### For Admins

1. **Deploy Contract**
   - You automatically become the first authorized teacher
   - Your wallet is the admin with special privileges

2. **Manage Teachers**
   - Use `manage_teachers.py` script
   - Add teachers: Grant authorization to new teachers
   - Remove teachers: Revoke authorization when needed
   - Check status: Verify teacher authorization

3. **Create Sessions**
   - Same as regular teachers
   - You retain all teacher privileges

## Security Considerations

### Authorization Hierarchy
- **Admin (Creator)**: Can add/remove teachers, create sessions, close sessions
- **Teachers**: Can create sessions, close sessions
- **Students**: Can opt-in, mark attendance

### Important Notes

1. **Opt-in Required**: Teachers must opt-in before being authorized
2. **Admin Cannot Be Removed**: The creator always has teacher privileges
3. **No Self-Authorization**: Teachers cannot grant themselves privileges
4. **Immutable Creator**: The admin address is set at deployment and cannot change

## Troubleshooting

### "Teacher must opt-in first"
**Solution**: Teacher needs to:
1. Visit the student page
2. Enter the App ID
3. Complete opt-in transaction

### "assert failed" when creating session
**Possible causes**:
1. Wallet is not authorized as teacher
2. Teacher hasn't opted in yet
3. Using wrong App ID

**Solution**: 
- Check teacher status using `manage_teachers.py` option 3
- Verify opt-in status
- Confirm correct App ID

### "only creator can add teachers"
**Solution**: Only the admin (original deployer) can manage teachers. Use the admin wallet mnemonic.

## Migration from Old Contract

If you have an existing contract without multi-teacher support:

1. **Deploy New Contract**
   ```bash
   python smart_contracts/attendance/deploy_testnet.py
   ```

2. **Update Frontend**
   - Change `ATTENDANCE_APP_ID` to new app ID
   - Update `.env` if using environment variables

3. **Authorize Teachers**
   - Each teacher opts in
   - Admin authorizes each teacher
   - Teachers can now create sessions

4. **Notify Users**
   - Students need to opt-in to the new app
   - Share new App ID via QR codes

## API Reference

### Contract Methods

#### `create_session`
- **Authorization**: Authorized teachers only
- **Args**: `["create_session", session_id, session_name, duration]`

#### `add_teacher`
- **Authorization**: Admin only
- **Args**: `["add_teacher"]`
- **Accounts**: `[teacher_address]`

#### `remove_teacher`
- **Authorization**: Admin only
- **Args**: `["remove_teacher"]`
- **Accounts**: `[teacher_address]`

#### `close_session`
- **Authorization**: Authorized teachers only
- **Args**: `["close_session"]`

#### `mark_attendance`
- **Authorization**: Any opted-in user
- **Args**: `["mark_attendance", session_id]`

### Frontend Hooks

```typescript
const { addTeacher, removeTeacher, isTeacher } = useAttendance();

// Add a teacher
await addTeacher(appId, teacherAddress);

// Remove a teacher
await removeTeacher(appId, teacherAddress);

// Check if address is teacher
const authorized = await isTeacher(teacherAddress, appId);
```

## Best Practices

1. **Keep Admin Credentials Secure**: The admin wallet has full control
2. **Regular Audits**: Periodically check authorized teachers
3. **Revoke When Needed**: Remove teachers who leave the institution
4. **Document Teachers**: Maintain a list of authorized addresses
5. **Test First**: Use TestNet before deploying to MainNet

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review transaction logs on AlgoExplorer
3. Verify wallet addresses and App ID
4. Ensure sufficient ALGO balance for transactions
