"""
Quick script to check teacher status on the blockchain
"""

from algosdk.v2client import algod
import sys

def main():
    print("=" * 60)
    print("Teacher Status Checker")
    print("=" * 60)
    
    # Connect to TestNet
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    algod_client = algod.AlgodClient(algod_token, algod_address)
    
    # Your details
    app_id = 755366519
    wallet_address = "ILUHQ3QQXFHDP3N7FQAREPGHQVVVPQN2BMN3H3722LT5BSMRVPWP6T4GF4"
    
    print(f"\nChecking status for:")
    print(f"App ID: {app_id}")
    print(f"Wallet: {wallet_address}")
    print()
    
    try:
        # Get app info to check creator
        app_info = algod_client.application_info(app_id)
        creator = app_info['params']['creator']
        
        print(f"Contract Creator: {creator}")
        print(f"Your Wallet:      {wallet_address}")
        print(f"Are you creator?  {creator == wallet_address}")
        print()
        
        # Check if user has opted in
        try:
            account_info = algod_client.account_application_info(wallet_address, app_id)
            
            if not account_info.get('app-local-state'):
                print("❌ STATUS: NOT OPTED IN")
                print()
                print("You need to opt-in to the app first!")
                print("Visit the teacher dashboard and click 'Opt-In to App'")
                return
            
            # User has opted in, check local state
            local_state = account_info['app-local-state']['key-value']
            
            print("✅ STATUS: OPTED IN")
            print()
            print("Local State:")
            
            is_teacher = False
            for item in local_state:
                import base64
                key = base64.b64decode(item['key']).decode('utf-8')
                
                if item['value']['type'] == 1:  # bytes
                    value = base64.b64decode(item['value']['bytes']).decode('utf-8')
                else:  # uint
                    value = item['value']['uint']
                
                print(f"  {key}: {value}")
                
                if key == 'is_teacher':
                    is_teacher = (value == 1)
            
            print()
            if is_teacher:
                print("✅ TEACHER STATUS: AUTHORIZED")
                print("You should have access to the teacher dashboard!")
            else:
                print("❌ TEACHER STATUS: NOT AUTHORIZED")
                print()
                if creator == wallet_address:
                    print("⚠️  PROBLEM: You are the creator but not marked as teacher!")
                    print("This means the opt-in happened before the contract was updated.")
                    print()
                    print("SOLUTION: You need to opt-in again to the NEW contract.")
                    print("The frontend should show 'Opt-In Required' button.")
                else:
                    print("You need the admin to authorize you:")
                    print("  python manage_teachers.py")
        
        except Exception as e:
            if "application does not exist" in str(e).lower():
                print("❌ STATUS: NOT OPTED IN")
                print()
                print("You need to opt-in to the app first!")
                print("Visit the teacher dashboard and click 'Opt-In to App'")
            else:
                print(f"Error checking opt-in status: {e}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("Make sure:")
        print("1. App ID is correct: 755366519")
        print("2. You have internet connection")
        print("3. The app exists on TestNet")


if __name__ == "__main__":
    main()
