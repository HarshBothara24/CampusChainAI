"""
CampusChain AI - Attendance Contract Deployment Configuration
"""

from algosdk.v2client import algod
from algosdk import account, mnemonic
from algosdk.transaction import ApplicationCreateTxn, OnComplete, StateSchema
import base64


class AttendanceDeployConfig:
    """Configuration for deploying attendance contract"""
    
    # State schema
    GLOBAL_SCHEMA = StateSchema(
        num_uints=4,  # start_time, end_time, is_active, total_attendance
        num_byte_slices=3  # session_id, session_name, creator
    )
    
    LOCAL_SCHEMA = StateSchema(
        num_uints=3,  # checked_in, check_in_time, is_teacher
        num_byte_slices=0
    )
    
    @staticmethod
    def get_algod_client(network="localnet"):
        """
        Get Algod client for specified network
        
        Args:
            network: "localnet", "testnet", or "mainnet"
        """
        if network == "localnet":
            algod_address = "http://localhost:4001"
            algod_token = "a" * 64
        elif network == "testnet":
            algod_address = "https://testnet-api.algonode.cloud"
            algod_token = ""
        else:
            raise ValueError(f"Unsupported network: {network}")
        
        return algod.AlgodClient(algod_token, algod_address)
    
    @staticmethod
    def deploy_contract(
        algod_client,
        creator_private_key,
        approval_program_compiled,
        clear_program_compiled,
        session_id,
        session_name,
        duration_seconds=3600
    ):
        """
        Deploy attendance contract to Algorand
        
        Args:
            algod_client: Algod client instance
            creator_private_key: Private key of deployer (teacher)
            approval_program_compiled: Compiled approval program (TEAL)
            clear_program_compiled: Compiled clear program (TEAL)
            session_id: Unique session identifier
            session_name: Human-readable session name
            duration_seconds: Session duration (default 1 hour)
        
        Returns:
            app_id: Application ID of deployed contract
        """
        # Get creator address
        creator_address = account.address_from_private_key(creator_private_key)
        
        # Get suggested params
        params = algod_client.suggested_params()
        
        # Application arguments for creation
        app_args = [
            session_id.encode(),
            session_name.encode(),
            duration_seconds.to_bytes(8, 'big')
        ]
        
        # Create application transaction
        txn = ApplicationCreateTxn(
            sender=creator_address,
            sp=params,
            on_complete=OnComplete.NoOpOC,
            approval_program=base64.b64decode(approval_program_compiled),
            clear_program=base64.b64decode(clear_program_compiled),
            global_schema=AttendanceDeployConfig.GLOBAL_SCHEMA,
            local_schema=AttendanceDeployConfig.LOCAL_SCHEMA,
            app_args=app_args
        )
        
        # Sign transaction
        signed_txn = txn.sign(creator_private_key)
        
        # Submit transaction
        tx_id = algod_client.send_transaction(signed_txn)
        
        # Wait for confirmation
        confirmed_txn = algod_client.pending_transaction_info(tx_id)
        app_id = confirmed_txn.get("application-index")
        
        print(f"✅ Contract deployed successfully!")
        print(f"📝 Application ID: {app_id}")
        print(f"🔗 Transaction ID: {tx_id}")
        
        return app_id


# Example deployment script
if __name__ == "__main__":
    import sys
    from contract import get_approval_program, get_clear_program
    
    # Compile programs
    approval_teal = get_approval_program()
    clear_teal = get_clear_program()
    
    print("=== Attendance Contract Deployment ===")
    print("\n1. Compile TEAL programs")
    print("2. Connect to network")
    print("3. Deploy contract")
    print("\nFor deployment instructions, see README.md")
