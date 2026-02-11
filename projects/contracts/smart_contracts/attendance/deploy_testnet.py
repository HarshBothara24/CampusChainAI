"""
CampusChain AI - Direct TestNet Deployment Script
No AlgoKit required - uses pure py-algorand-sdk
"""

from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, OnComplete, StateSchema, wait_for_confirmation
import base64
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from contract import get_approval_program, get_clear_program
from deploy_config import AttendanceDeployConfig


def main():
    print("=" * 60)
    print("CampusChain AI - TestNet Deployment")
    print("=" * 60)
    
    # Connect to TestNet
    print("\n[1/6] Connecting to TestNet...")
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    algod_client = algod.AlgodClient(algod_token, algod_address)
    
    try:
        status = algod_client.status()
        print(f"✅ Connected to TestNet (Round: {status['last-round']})")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("Check your internet connection")
        return
    
    # Get deployer account
    print("\n[2/6] Setting up deployer account...")
    print("\nOptions:")
    print("1. Enter existing mnemonic")
    print("2. Generate new account")
    
    choice = input("Choose (1/2): ").strip()
    
    if choice == "2":
        # Generate new account
        private_key, address = account.generate_account()
        mn = mnemonic.from_private_key(private_key)
        
        print("\n🔑 NEW ACCOUNT GENERATED")
        print("=" * 60)
        print(f"Address: {address}")
        print(f"\nMnemonic (SAVE THIS SECURELY):")
        print(mn)
        print("=" * 60)
        
        deployer_private_key = private_key
        deployer_address = address
        
        print("\n⚠️  IMPORTANT: Fund this account before continuing!")
        print(f"1. Visit: https://bank.testnet.algorand.network/")
        print(f"2. Enter address: {address}")
        print(f"3. Click 'Dispense' to get 10 ALGO")
        input("\nPress Enter after funding the account...")
    else:
        # Use existing mnemonic
        deployer_mnemonic = input("\nEnter your 25-word mnemonic: ").strip()
        try:
            deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
            deployer_address = account.address_from_private_key(deployer_private_key)
        except Exception as e:
            print(f"❌ Invalid mnemonic: {e}")
            return
    
    print(f"\n✅ Deployer address: {deployer_address}")
    
    # Check balance
    try:
        account_info = algod_client.account_info(deployer_address)
        balance = account_info.get('amount') / 1_000_000
        print(f"   Balance: {balance} ALGO")
        
        if balance < 0.1:
            print("\n❌ Insufficient balance!")
            print("Get TestNet ALGO: https://bank.testnet.algorand.network/")
            return
    except Exception as e:
        print(f"⚠️  Could not check balance: {e}")
        print("Account may not exist on TestNet yet. Fund it first.")
        return
    
    # Compile contract
    print("\n[3/6] Compiling contract...")
    try:
        approval_teal = get_approval_program()
        clear_teal = get_clear_program()
        
        approval_result = algod_client.compile(approval_teal)
        clear_result = algod_client.compile(clear_teal)
        
        approval_binary = base64.b64decode(approval_result['result'])
        clear_binary = base64.b64decode(clear_result['result'])
        
        print("✅ Contract compiled successfully")
    except Exception as e:
        print(f"❌ Compilation failed: {e}")
        return
    
    # Get session details
    print("\n[4/6] Configure attendance session...")
    session_id = input("Session ID (e.g., CS101_2026_02_11): ").strip()
    session_name = input("Session name (e.g., Computer Science 101): ").strip()
    duration_input = input("Duration in seconds (default 3600): ").strip()
    duration = int(duration_input) if duration_input else 3600
    
    # Deploy
    print("\n[5/6] Deploying to TestNet...")
    try:
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
        
        print("\n" + "=" * 60)
        print("🎉 DEPLOYMENT SUCCESSFUL!")
        print("=" * 60)
        print(f"Application ID: {app_id}")
        print(f"Session ID: {session_id}")
        print(f"Session Name: {session_name}")
        print(f"Duration: {duration} seconds")
        print(f"\n🔗 View on AlgoExplorer:")
        print(f"https://testnet.algoexplorer.io/application/{app_id}")
        
        # Opt-in creator to get teacher privileges
        print("\n[6/6] Opting in creator as teacher...")
        try:
            params = algod_client.suggested_params()
            
            from algosdk.transaction import ApplicationOptInTxn
            opt_in_txn = ApplicationOptInTxn(
                sender=deployer_address,
                sp=params,
                index=app_id
            )
            
            signed_opt_in = opt_in_txn.sign(deployer_private_key)
            opt_in_tx_id = algod_client.send_transaction(signed_opt_in)
            
            print(f"📤 Opt-in transaction sent: {opt_in_tx_id}")
            wait_for_confirmation(algod_client, opt_in_tx_id, 4)
            
            print("✅ Creator opted in and granted teacher privileges!")
        except Exception as e:
            print(f"⚠️  Opt-in failed: {e}")
            print("   You'll need to opt-in manually before creating sessions")
        
        print("\n📝 Next Steps:")
        print("1. Save the app_id for your frontend")
        print("2. You can now create sessions as an authorized teacher")
        print("3. Other teachers must opt-in before being authorized")
        print("4. Use manage_teachers.py to authorize additional teachers")
        
        # Save deployment info
        with open("deployment_info.txt", "w") as f:
            f.write(f"App ID: {app_id}\n")
            f.write(f"Session ID: {session_id}\n")
            f.write(f"Session Name: {session_name}\n")
            f.write(f"Creator: {deployer_address}\n")
            f.write(f"Explorer: https://testnet.algoexplorer.io/application/{app_id}\n")
        
        print("\n💾 Deployment info saved to: deployment_info.txt")
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
