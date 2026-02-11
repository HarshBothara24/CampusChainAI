"""
CampusChain AI - Teacher Management Script
Add or remove authorized teachers from the attendance contract
"""

from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCallTxn, OnComplete, wait_for_confirmation
import sys


def main():
    print("=" * 60)
    print("CampusChain AI - Teacher Management")
    print("=" * 60)
    
    # Connect to TestNet
    print("\n[1/4] Connecting to TestNet...")
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    algod_client = algod.AlgodClient(algod_token, algod_address)
    
    try:
        status = algod_client.status()
        print(f"✅ Connected to TestNet (Round: {status['last-round']})")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return
    
    # Get admin credentials
    print("\n[2/4] Admin Authentication...")
    print("⚠️  Only the contract creator can manage teachers")
    admin_mnemonic = input("Enter admin (creator) mnemonic: ").strip()
    
    try:
        admin_private_key = mnemonic.to_private_key(admin_mnemonic)
        admin_address = account.address_from_private_key(admin_private_key)
        print(f"✅ Admin address: {admin_address}")
    except Exception as e:
        print(f"❌ Invalid mnemonic: {e}")
        return
    
    # Get app details
    print("\n[3/4] Contract Details...")
    app_id = input("Enter Application ID: ").strip()
    
    try:
        app_id = int(app_id)
        app_info = algod_client.application_info(app_id)
        print(f"✅ Contract found: App ID {app_id}")
    except Exception as e:
        print(f"❌ Invalid app ID: {e}")
        return
    
    # Choose action
    print("\n[4/4] Select Action...")
    print("1. Add Teacher")
    print("2. Remove Teacher")
    print("3. Check Teacher Status")
    
    choice = input("Choose (1/2/3): ").strip()
    
    if choice in ["1", "2"]:
        teacher_address = input("\nEnter teacher wallet address: ").strip()
        
        # Verify address format
        if len(teacher_address) != 58:
            print("❌ Invalid Algorand address format")
            return
        
        # Check if teacher needs to opt-in first
        try:
            account_info = algod_client.account_application_information(teacher_address, app_id)
            if not account_info.get('app-local-state'):
                print("\n⚠️  Teacher must opt-in to the app first!")
                print(f"   Teacher should visit the student page and opt-in to app {app_id}")
                return
        except Exception as e:
            print(f"\n⚠️  Teacher must opt-in to the app first!")
            print(f"   Teacher should visit the student page and opt-in to app {app_id}")
            return
        
        try:
            params = algod_client.suggested_params()
            
            if choice == "1":
                # Add teacher
                app_args = [b"add_teacher"]
                print(f"\n📝 Adding teacher: {teacher_address}")
            else:
                # Remove teacher
                app_args = [b"remove_teacher"]
                print(f"\n📝 Removing teacher: {teacher_address}")
            
            txn = ApplicationCallTxn(
                sender=admin_address,
                sp=params,
                index=app_id,
                on_complete=OnComplete.NoOpOC,
                app_args=app_args,
                accounts=[teacher_address]  # Teacher address in accounts array
            )
            
            # Sign and send
            signed_txn = txn.sign(admin_private_key)
            tx_id = algod_client.send_transaction(signed_txn)
            
            print(f"📤 Transaction sent: {tx_id}")
            print("⏳ Waiting for confirmation...")
            
            wait_for_confirmation(algod_client, tx_id, 4)
            
            print("\n" + "=" * 60)
            print("✅ SUCCESS!")
            print("=" * 60)
            
            if choice == "1":
                print(f"Teacher {teacher_address[:8]}... has been authorized")
                print("They can now create and manage attendance sessions")
            else:
                print(f"Teacher {teacher_address[:8]}... has been removed")
                print("They can no longer create sessions")
            
            print(f"\n🔗 View transaction:")
            print(f"https://testnet.algoexplorer.io/tx/{tx_id}")
            
        except Exception as e:
            print(f"\n❌ Operation failed: {e}")
            import traceback
            traceback.print_exc()
    
    elif choice == "3":
        # Check teacher status
        teacher_address = input("\nEnter teacher wallet address: ").strip()
        
        try:
            account_info = algod_client.account_application_information(teacher_address, app_id)
            
            if not account_info.get('app-local-state'):
                print(f"\n❌ Address has not opted into app {app_id}")
                return
            
            local_state = account_info['app-local-state']['key-value']
            is_teacher = False
            
            for item in local_state:
                import base64
                key = base64.b64decode(item['key']).decode('utf-8')
                if key == 'is_teacher':
                    is_teacher = item['value']['uint'] == 1
                    break
            
            print("\n" + "=" * 60)
            if is_teacher:
                print("✅ AUTHORIZED TEACHER")
                print(f"Address: {teacher_address}")
                print("Status: Can create and manage sessions")
            else:
                print("❌ NOT AUTHORIZED")
                print(f"Address: {teacher_address}")
                print("Status: Regular user (student)")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n❌ Failed to check status: {e}")
    
    else:
        print("❌ Invalid choice")


if __name__ == "__main__":
    main()
