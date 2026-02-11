"""
CampusChain AI - Test Student Attendance on TestNet

This script simulates a student marking attendance:
1. Generate student account (or use existing)
2. Fund account from faucet
3. Opt-in to attendance app
4. Mark attendance
5. Verify on-chain
"""

from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationOptInTxn, ApplicationNoOpTxn, wait_for_confirmation
import time


def main():
    print("=" * 60)
    print("CampusChain AI - Student Attendance Test")
    print("=" * 60)
    
    # Connect to TestNet
    print("\n[1/6] Connecting to TestNet...")
    algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
    
    try:
        status = algod_client.status()
        print(f"✅ Connected (Round: {status['last-round']})")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return
    
    # Get app details
    print("\n[2/6] Enter deployment details...")
    app_id = int(input("Enter app_id from deployment: ").strip())
    session_id = input("Enter session_id (e.g., NLP01_2026_02_11): ").strip()
    
    # Student account
    print("\n[3/6] Setting up student account...")
    print("\nOptions:")
    print("1. Generate new student account")
    print("2. Use existing student mnemonic")
    
    choice = input("Choose (1/2): ").strip()
    
    if choice == "1":
        # Generate new student
        private_key, address = account.generate_account()
        mn = mnemonic.from_private_key(private_key)
        
        print("\n🎓 STUDENT ACCOUNT GENERATED")
        print("=" * 60)
        print(f"Address: {address}")
        print(f"\nMnemonic (SAVE THIS):")
        print(mn)
        print("=" * 60)
        
        student_private_key = private_key
        student_address = address
        
        print("\n⚠️  Fund this account before continuing!")
        print(f"1. Visit: https://bank.testnet.algorand.network/")
        print(f"2. Enter address: {address}")
        print(f"3. Click 'Dispense'")
        input("\nPress Enter after funding...")
    else:
        # Use existing
        student_mnemonic = input("\nEnter student 25-word mnemonic: ").strip()
        try:
            student_private_key = mnemonic.to_private_key(student_mnemonic)
            student_address = account.address_from_private_key(student_private_key)
        except Exception as e:
            print(f"❌ Invalid mnemonic: {e}")
            return
    
    print(f"\n✅ Student address: {student_address}")
    
    # Check balance
    try:
        account_info = algod_client.account_info(student_address)
        balance = account_info.get('amount') / 1_000_000
        print(f"   Balance: {balance} ALGO")
        
        if balance < 0.1:
            print("\n❌ Insufficient balance!")
            print("Get TestNet ALGO: https://bank.testnet.algorand.network/")
            return
    except Exception as e:
        print(f"❌ Account not found: {e}")
        print("Make sure the account is funded on TestNet")
        return
    
    # Opt-in to app
    print("\n[4/6] Opting in to attendance app...")
    try:
        params = algod_client.suggested_params()
        
        opt_in_txn = ApplicationOptInTxn(
            sender=student_address,
            sp=params,
            index=app_id
        )
        
        signed_txn = opt_in_txn.sign(student_private_key)
        tx_id = algod_client.send_transaction(signed_txn)
        
        print(f"📤 Opt-in transaction sent: {tx_id}")
        print("⏳ Waiting for confirmation...")
        
        wait_for_confirmation(algod_client, tx_id, 4)
        
        print("✅ Successfully opted in!")
        print(f"🔗 View: https://testnet.algoexplorer.io/tx/{tx_id}")
        
    except Exception as e:
        error_msg = str(e)
        if "already opted in" in error_msg.lower():
            print("ℹ️  Already opted in (skipping)")
        else:
            print(f"❌ Opt-in failed: {e}")
            return
    
    # Mark attendance
    print("\n[5/6] Marking attendance...")
    try:
        params = algod_client.suggested_params()
        
        mark_txn = ApplicationNoOpTxn(
            sender=student_address,
            sp=params,
            index=app_id,
            app_args=[b"mark_attendance", session_id.encode()]
        )
        
        signed_txn = mark_txn.sign(student_private_key)
        tx_id = algod_client.send_transaction(signed_txn)
        
        print(f"📤 Attendance transaction sent: {tx_id}")
        print("⏳ Waiting for confirmation...")
        
        result = wait_for_confirmation(algod_client, tx_id, 4)
        
        print("\n" + "=" * 60)
        print("🎉 ATTENDANCE MARKED SUCCESSFULLY!")
        print("=" * 60)
        print(f"Transaction ID: {tx_id}")
        print(f"Round: {result['confirmed-round']}")
        print(f"\n🔗 View on AlgoExplorer:")
        print(f"https://testnet.algoexplorer.io/tx/{tx_id}")
        
    except Exception as e:
        error_msg = str(e)
        if "assert failed" in error_msg.lower():
            print("\n❌ Attendance marking failed!")
            print("\nPossible reasons:")
            print("- Already marked attendance (duplicate)")
            print("- Session has expired")
            print("- Session ID doesn't match")
            print("- Session is not active")
        else:
            print(f"❌ Error: {e}")
        return
    
    # Verify local state
    print("\n[6/6] Verifying on-chain state...")
    try:
        account_info = algod_client.account_application_info(student_address, app_id)
        
        if 'app-local-state' in account_info:
            local_state = account_info['app-local-state'].get('key-value', [])
            
            print("\n📊 Student's Local State:")
            for item in local_state:
                key = item['key']
                value = item['value']
                
                # Decode key
                import base64
                key_decoded = base64.b64decode(key).decode('utf-8')
                
                # Get value
                if value['type'] == 1:  # bytes
                    val = base64.b64decode(value['bytes']).decode('utf-8')
                else:  # uint
                    val = value['uint']
                
                print(f"  {key_decoded}: {val}")
        
        # Get global state
        app_info = algod_client.application_info(app_id)
        global_state = app_info['params'].get('global-state', [])
        
        print("\n📊 Global State (Session Info):")
        for item in global_state:
            key = item['key']
            value = item['value']
            
            import base64
            key_decoded = base64.b64decode(key).decode('utf-8')
            
            if value['type'] == 1:  # bytes
                try:
                    val = base64.b64decode(value['bytes']).decode('utf-8')
                except:
                    val = value['bytes']
            else:  # uint
                val = value['uint']
            
            print(f"  {key_decoded}: {val}")
        
        print("\n✅ Verification complete!")
        
    except Exception as e:
        print(f"⚠️  Could not verify state: {e}")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE!")
    print("=" * 60)
    print("\n📝 Summary:")
    print(f"✅ Student opted in to app {app_id}")
    print(f"✅ Attendance marked for session {session_id}")
    print(f"✅ Data stored on Algorand TestNet")
    print("\n🎯 Next: Build frontend with QR codes and wallet integration")


if __name__ == "__main__":
    main()
