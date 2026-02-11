"""
CampusChain AI - Attendance Contract Deployment Script

This script compiles and deploys the attendance contract to LocalNet or TestNet.
"""

import sys
import os
from algosdk import account, mnemonic
from algosdk.v2client import algod
import base64

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from contract import get_approval_program, get_clear_program
from deploy_config import AttendanceDeployConfig


def compile_contract(algod_client, source_code):
    """
    Compile TEAL source code using Algod
    
    Args:
        algod_client: Algod client instance
        source_code: TEAL source code as string
    
    Returns:
        Compiled program as base64 string
    """
    compile_response = algod_client.compile(source_code)
    return compile_response['result']


def main():
    """Main deployment script"""
    
    print("=" * 60)
    print("CampusChain AI - Attendance Contract Deployment")
    print("=" * 60)
    
    # Step 1: Compile contract
    print("\n[1/4] Compiling contract...")
    approval_teal = get_approval_program()
    clear_teal = get_clear_program()
    print("✅ Contract compiled successfully")
    
    # Step 2: Connect to network
    print("\n[2/4] Connecting to LocalNet...")
    network = input("Enter network (localnet/testnet) [localnet]: ").strip() or "localnet"
    
    try:
        algod_client = AttendanceDeployConfig.get_algod_client(network)
        status = algod_client.status()
        print(f"✅ Connected to {network}")
        print(f"   Current round: {status['last-round']}")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        print("\nTroubleshooting:")
        print("  - For LocalNet: Run 'algokit localnet start'")
        print("  - For TestNet: Check internet connection")
        return
    
    # Step 3: Get deployer account
    print("\n[3/4] Setting up deployer account...")
    
    if network == "localnet":
        # Use default LocalNet account
        print("Using LocalNet default account...")
        # Default LocalNet account (from sandbox)
        deployer_mnemonic = "auction inquiry lava second expand liberty glass involve ginger illness length room item discover ahead table doctor term tackle cement bonus profit right above catch"
        deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
        deployer_address = account.address_from_private_key(deployer_private_key)
    else:
        # Prompt for TestNet account
        deployer_mnemonic = input("Enter your 25-word mnemonic: ").strip()
        try:
            deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
            deployer_address = account.address_from_private_key(deployer_private_key)
        except Exception as e:
            print(f"❌ Invalid mnemonic: {e}")
            return
    
    print(f"✅ Deployer address: {deployer_address}")
    
    # Check balance
    account_info = algod_client.account_info(deployer_address)
    balance = account_info.get('amount') / 1_000_000  # Convert microAlgos to Algos
    print(f"   Balance: {balance} ALGO")
    
    if balance < 0.1:
        print("⚠️  Warning: Low balance. You may need more ALGO for deployment.")
        if network == "testnet":
            print("   Get TestNet ALGO: https://bank.testnet.algorand.network/")
    
    # Step 4: Deploy contract
    print("\n[4/4] Deploying contract...")
    
    session_id = input("Enter session ID (e.g., CS101_2026_02_11): ").strip()
    session_name = input("Enter session name (e.g., Computer Science 101): ").strip()
    duration = input("Enter duration in seconds (default 3600): ").strip() or "3600"
    
    try:
        # Compile programs with Algod
        print("   Compiling TEAL programs...")
        approval_compiled = compile_contract(algod_client, approval_teal)
        clear_compiled = compile_contract(algod_client, clear_teal)
        
        print("   Submitting deployment transaction...")
        app_id = AttendanceDeployConfig.deploy_contract(
            algod_client=algod_client,
            creator_private_key=deployer_private_key,
            approval_program_compiled=approval_compiled,
            clear_program_compiled=clear_compiled,
            session_id=session_id,
            session_name=session_name,
            duration_seconds=int(duration)
        )
        
        print("\n" + "=" * 60)
        print("🎉 DEPLOYMENT SUCCESSFUL!")
        print("=" * 60)
        print(f"Application ID: {app_id}")
        print(f"Session ID: {session_id}")
        print(f"Session Name: {session_name}")
        print(f"Duration: {duration} seconds")
        
        if network == "testnet":
            print(f"\n🔗 View on AlgoExplorer:")
            print(f"   https://testnet.algoexplorer.io/application/{app_id}")
        
        print("\n📝 Next Steps:")
        print("1. Students must opt-in to the app before marking attendance")
        print("2. Use the app_id in your frontend QR code generation")
        print("3. Test attendance marking with student wallets")
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
