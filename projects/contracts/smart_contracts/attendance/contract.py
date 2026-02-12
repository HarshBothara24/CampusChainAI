"""
CampusChain AI - Attendance Smart Contract (Multi-Teacher + Anti-Proxy Security)
Built with PyTeal for Algorand blockchain

Features:
- Multi-teacher authorization using local state
- Wallet-bound dynamic QR codes (anti-proxy security)
- Round-based expiry (prevents QR sharing)
- Session creation and management
- Duplicate attendance prevention
- On-chain verification
"""

from pyteal import *

def approval_program():
    """
    Main approval program for attendance contract
    
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
    
    Security Features:
    - QR codes are wallet-bound (cannot be shared)
    - QR codes expire after 5 rounds (~15 seconds)
    - Hash validation: SHA256(session_id + qr_round + student_address)
    """
    
    # Global state keys
    session_id_key = Bytes("session_id")
    session_name_key = Bytes("session_name")
    creator_key = Bytes("creator")
    start_round_key = Bytes("start_round")
    end_round_key = Bytes("end_round")
    attendance_end_round_key = Bytes("attendance_end_round")  # New: when attendance window closes
    is_active_key = Bytes("is_active")
    total_attendance_key = Bytes("total_attendance")
    
    # Local state keys
    checked_in_key = Bytes("checked_in")
    check_in_round_key = Bytes("check_in_round")
    is_teacher_key = Bytes("is_teacher")
    
    # Constants
    QR_VALIDITY_ROUNDS = Int(20)  # QR valid for 20 rounds (~60 seconds)
    
    # Helper function to check if sender is authorized teacher
    is_authorized_teacher = Or(
        Txn.sender() == App.globalGet(creator_key),  # Creator is always authorized
        App.localGet(Txn.sender(), is_teacher_key) == Int(1)  # Or has teacher flag
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
        # Attendance window: If 4th arg provided, use it; otherwise same as end_round
        App.globalPut(
            attendance_end_round_key,
            If(Txn.application_args.length() > Int(3))
            .Then(Global.round() + (Btoi(Txn.application_args[3]) / Int(3)))
            .Else(Global.round() + (Btoi(Txn.application_args[2]) / Int(3)))
        ),
        App.globalPut(is_active_key, Int(1)),
        App.globalPut(total_attendance_key, Int(0)),
        # Note: Creator must opt-in separately to get teacher privileges
        Approve()
    ])
    
    # Method: Create new attendance session
    # Args: ["create_session", session_id, session_name, duration_seconds, attendance_window_seconds (optional)]
    create_session = Seq([
        # Verify caller is an authorized teacher
        Assert(is_authorized_teacher),
        
        # Update session details
        App.globalPut(session_id_key, Txn.application_args[1]),
        App.globalPut(session_name_key, Txn.application_args[2]),
        App.globalPut(start_round_key, Global.round()),
        # Convert duration from seconds to rounds (approx 3 seconds per round)
        App.globalPut(end_round_key, Global.round() + (Btoi(Txn.application_args[3]) / Int(3))),
        # Attendance window: If 5th arg provided, use it; otherwise same as end_round
        App.globalPut(
            attendance_end_round_key,
            If(Txn.application_args.length() > Int(4))
            .Then(Global.round() + (Btoi(Txn.application_args[4]) / Int(3)))
            .Else(Global.round() + (Btoi(Txn.application_args[3]) / Int(3)))
        ),
        App.globalPut(is_active_key, Int(1)),
        App.globalPut(total_attendance_key, Int(0)),
        Approve()
    ])
    
    # Method: Mark student attendance with wallet-bound QR validation
    # Args: ["mark_attendance", session_id, qr_round, qr_hash]
    # 
    # Security: QR hash must equal SHA256(session_id + qr_round + Txn.sender())
    # This binds the QR to a specific wallet, preventing sharing
    mark_attendance = Seq([
        # 1. Verify session is active
        Assert(App.globalGet(is_active_key) == Int(1)),
        
        # 2. Verify attendance window hasn't closed (use attendance_end_round, not end_round)
        Assert(Global.round() <= App.globalGet(attendance_end_round_key)),
        
        # 3. Verify session_id matches
        Assert(Txn.application_args[1] == App.globalGet(session_id_key)),
        
        # 4. Verify student hasn't already checked in (duplicate prevention)
        Assert(App.localGet(Txn.sender(), checked_in_key) == Int(0)),
        
        # 5. Verify qr_round is 8 bytes (uint64)
        Assert(Len(Txn.application_args[2]) == Int(8)),
        
        # 6. Verify QR is not older than 20 rounds (anti-replay, ~60 seconds)
        Assert(Global.round() - Btoi(Txn.application_args[2]) <= QR_VALIDITY_ROUNDS),
        
        # 7. Verify wallet-bound hash
        # Expected hash = SHA256(session_id + qr_round + sender_address)
        # This ensures QR can only be used by the intended wallet
        Assert(
            Txn.application_args[3] == Sha256(
                Concat(
                    Txn.application_args[1],  # session_id (bytes)
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
        # Verify caller is an authorized teacher
        Assert(is_authorized_teacher),
        
        # Mark session as inactive
        App.globalPut(is_active_key, Int(0)),
        Approve()
    ])
    
    # Method: Add teacher (admin only)
    # Args: ["add_teacher"]
    # Accounts: [teacher_address]
    add_teacher = Seq([
        # Only creator can add teachers
        Assert(Txn.sender() == App.globalGet(creator_key)),
        
        # Verify teacher address is provided in accounts array
        Assert(Txn.accounts.length() > Int(0)),
        
        # Grant teacher privileges to the specified account
        App.localPut(Txn.accounts[1], is_teacher_key, Int(1)),
        Approve()
    ])
    
    # Method: Remove teacher (admin only)
    # Args: ["remove_teacher"]
    # Accounts: [teacher_address]
    remove_teacher = Seq([
        # Only creator can remove teachers
        Assert(Txn.sender() == App.globalGet(creator_key)),
        
        # Verify teacher address is provided in accounts array
        Assert(Txn.accounts.length() > Int(0)),
        
        # Revoke teacher privileges
        App.localPut(Txn.accounts[1], is_teacher_key, Int(0)),
        Approve()
    ])
    
    # Method: Opt-in (required for local state)
    on_opt_in = Seq([
        # Initialize local state (works for both students and teachers)
        App.localPut(Txn.sender(), checked_in_key, Int(0)),
        App.localPut(Txn.sender(), check_in_round_key, Int(0)),
        # If sender is creator, automatically grant teacher privileges
        If(Txn.sender() == App.globalGet(creator_key))
        .Then(App.localPut(Txn.sender(), is_teacher_key, Int(1)))
        .Else(App.localPut(Txn.sender(), is_teacher_key, Int(0))),
        Approve()
    ])
    
    # Method router based on application args
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
    """
    Clear state program (called when user clears local state)
    Always approve to allow students to opt-out
    """
    return Approve()


def get_approval_program():
    """Compile and return approval program"""
    return compileTeal(approval_program(), mode=Mode.Application, version=6)


def get_clear_program():
    """Compile and return clear state program"""
    return compileTeal(clear_state_program(), mode=Mode.Application, version=6)


if __name__ == "__main__":
    # Compile and print TEAL code
    print("=== APPROVAL PROGRAM (Multi-Teacher + Anti-Proxy) ===")
    print(get_approval_program())
    print("\n=== CLEAR STATE PROGRAM ===")
    print(get_clear_program())
