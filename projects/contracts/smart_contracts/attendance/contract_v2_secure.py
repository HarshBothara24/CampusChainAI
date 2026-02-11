"""
CampusChain AI - Attendance Smart Contract V2 (Anti-Proxy Security)
Built with PyTeal for Algorand blockchain

SECURITY UPGRADE: Wallet-Bound Dynamic QR Codes
- QR codes are bound to specific wallet addresses
- QR codes expire after 5 rounds (~15 seconds)
- Prevents QR sharing and proxy attendance
- Maintains all existing features
"""

from pyteal import *

def approval_program():
    """
    Main approval program for attendance contract with anti-proxy security
    
    Global State Schema (per session):
    - session_id (Bytes): Unique session identifier
    - session_name (Bytes): Human-readable session name
    - creator (Bytes): Original contract creator (admin)
    - start_round (Int): Session start round number
    - end_round (Int): Session expiry round number
    - is_active (Int): Session status (1=active, 0=closed)
    - total_attendance (Int): Count of students checked in
    
    Local State Schema:
    - For students:
      - checked_in (Int): Attendance status (1=present, 0=absent)
      - check_in_round (Int): Round number when attendance was marked
    - For teachers:
      - is_teacher (Int): Authorization flag (1=authorized, 0=not authorized)
    """
    
    # Global state keys
    session_id_key = Bytes("session_id")
    session_name_key = Bytes("session_name")
    creator_key = Bytes("creator")
    start_round_key = Bytes("start_round")
    end_round_key = Bytes("end_round")
    is_active_key = Bytes("is_active")
    total_attendance_key = Bytes("total_attendance")
    
    # Local state keys
    checked_in_key = Bytes("checked_in")
    check_in_round_key = Bytes("check_in_round")
    is_teacher_key = Bytes("is_teacher")
    
    # Constants
    QR_VALIDITY_ROUNDS = Int(5)  # QR valid for 5 rounds (~15 seconds)
    
    # Helper function to check if sender is authorized teacher
    is_authorized_teacher = Or(
        Txn.sender() == App.globalGet(creator_key),
        App.localGet(Txn.sender(), is_teacher_key) == Int(1)
    )
    
    # Application call handlers
    on_creation = Seq([
        # Initialize global state on contract creation
        App.globalPut(session_id_key, Txn.application_args[0]),
        App.globalPut(session_name_key, Txn.application_args[1]),
        App.globalPut(creator_key, Txn.sender()),
        App.globalPut(start_round_key, Global.round()),
        # Duration in rounds: duration_seconds / 3 (approx 3 sec per round)
        App.globalPut(end_round_key, Global.round() + (Btoi(Txn.application_args[2]) / Int(3))),
        App.globalPut(is_active_key, Int(1)),
        App.globalPut(total_attendance_key, Int(0)),
        Approve()
    ])
    
    # Method: Create new attendance session
    # Args: ["create_session", session_id, session_name, duration_seconds]
    create_session = Seq([
        Assert(is_authorized_teacher),
        App.globalPut(session_id_key, Txn.application_args[1]),
        App.globalPut(session_name_key, Txn.application_args[2]),
        App.globalPut(start_round_key, Global.round()),
        App.globalPut(end_round_key, Global.round() + (Btoi(Txn.application_args[3]) / Int(3))),
        App.globalPut(is_active_key, Int(1)),
        App.globalPut(total_attendance_key, Int(0)),
        Approve()
    ])
    
    # Method: Mark student attendance with wallet-bound QR validation
    # Args: ["mark_attendance", session_id, qr_round, qr_hash]
    mark_attendance = Seq([
        # 1. Verify session is active
        Assert(App.globalGet(is_active_key) == Int(1)),
        
        # 2. Verify session hasn't expired (round-based)
        Assert(Global.round() <= App.globalGet(end_round_key)),
        
        # 3. Verify session_id matches
        Assert(Txn.application_args[1] == App.globalGet(session_id_key)),
        
        # 4. Verify student hasn't already checked in
        Assert(App.localGet(Txn.sender(), checked_in_key) == Int(0)),
        
        # 5. Extract qr_round from args
        # qr_round is passed as bytes, convert to int
        Assert(Len(Txn.application_args[2]) == Int(8)),  # Must be 8 bytes (uint64)
        
        # 6. Verify QR is not older than 5 rounds (anti-replay)
        Assert(Global.round() - Btoi(Txn.application_args[2]) <= QR_VALIDITY_ROUNDS),
        
        # 7. Compute expected hash: SHA256(session_id + qr_round + sender_address)
        # This binds the QR to the specific wallet
        Assert(
            Txn.application_args[3] == Sha256(
                Concat(
                    Txn.application_args[1],  # session_id
                    Txn.application_args[2],  # qr_round (8 bytes)
                    Txn.sender()              # student wallet address (32 bytes)
                )
            )
        ),
        
        # 8. Mark attendance in local state
        App.localPut(Txn.sender(), checked_in_key, Int(1)),
        App.localPut(Txn.sender(), check_in_round_key, Global.round()),
        
        # 9. Increment total attendance count
        App.globalPut(total_attendance_key, App.globalGet(total_attendance_key) + Int(1)),
        
        Approve()
    ])
    
    # Method: Close attendance session
    close_session = Seq([
        Assert(is_authorized_teacher),
        App.globalPut(is_active_key, Int(0)),
        Approve()
    ])
    
    # Method: Add teacher (admin only)
    add_teacher = Seq([
        Assert(Txn.sender() == App.globalGet(creator_key)),
        Assert(Txn.accounts.length() > Int(0)),
        App.localPut(Txn.accounts[1], is_teacher_key, Int(1)),
        Approve()
    ])
    
    # Method: Remove teacher (admin only)
    remove_teacher = Seq([
        Assert(Txn.sender() == App.globalGet(creator_key)),
        Assert(Txn.accounts.length() > Int(0)),
        App.localPut(Txn.accounts[1], is_teacher_key, Int(0)),
        Approve()
    ])
    
    # Method: Opt-in (required for local state)
    on_opt_in = Seq([
        App.localPut(Txn.sender(), checked_in_key, Int(0)),
        App.localPut(Txn.sender(), check_in_round_key, Int(0)),
        If(Txn.sender() == App.globalGet(creator_key))
        .Then(App.localPut(Txn.sender(), is_teacher_key, Int(1)))
        .Else(App.localPut(Txn.sender(), is_teacher_key, Int(0))),
        Approve()
    ])
    
    # Method router
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.OptIn, on_opt_in],
        [Txn.on_completion() == OnComplete.CloseOut, Approve()],
        [Txn.on_completion() == OnComplete.UpdateApplication, Reject()],
        [Txn.on_completion() == OnComplete.DeleteApplication, Reject()],
        [Txn.application_args[0] == Bytes("create_session"), create_session],
        [Txn.application_args[0] == Bytes("mark_attendance"), mark_attendance],
        [Txn.application_args[0] == Bytes("close_session"), close_session],
        [Txn.application_args[0] == Bytes("add_teacher"), add_teacher],
        [Txn.application_args[0] == Bytes("remove_teacher"), remove_teacher],
    )
    
    return program


def clear_state_program():
    """Clear state program"""
    return Approve()


def get_approval_program():
    """Compile and return approval program"""
    return compileTeal(approval_program(), mode=Mode.Application, version=6)


def get_clear_program():
    """Compile and return clear state program"""
    return compileTeal(clear_state_program(), mode=Mode.Application, version=6)


if __name__ == "__main__":
    print("=== APPROVAL PROGRAM (V2 - Anti-Proxy) ===")
    print(get_approval_program())
    print("\n=== CLEAR STATE PROGRAM ===")
    print(get_clear_program())
