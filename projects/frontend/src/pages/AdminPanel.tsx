import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { WalletButton } from '../components/attendance/WalletButton';
import { Shield, UserPlus, UserMinus, CheckCircle, XCircle, Loader, Search } from 'lucide-react';
import { useAttendance } from '../utils/useAttendance';
import { ATTENDANCE_APP_ID } from '../utils/algorand';

export const AdminPanel: React.FC = () => {
    const { activeAddress } = useWallet();
    const { addTeacher, removeTeacher, isTeacher, getCreator, getOptedInAccounts } = useAttendance();

    const [isAdmin, setIsAdmin] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [teacherAddress, setTeacherAddress] = React.useState('');
    const [processing, setProcessing] = React.useState(false);
    const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [checkAddress, setCheckAddress] = React.useState('');
    const [checkResult, setCheckResult] = React.useState<{ address: string; isTeacher: boolean } | null>(null);
    const [checking, setChecking] = React.useState(false);
    const [users, setUsers] = React.useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = React.useState(false);
    const [showUsers, setShowUsers] = React.useState(false);

    // Check if current user is admin (creator)
    React.useEffect(() => {
        const checkAdminStatus = async () => {
            if (!activeAddress) {
                setLoading(false);
                return;
            }

            try {
                const creator = await getCreator(ATTENDANCE_APP_ID);
                console.log('Contract creator:', creator);
                console.log('Current user:', activeAddress);
                
                if (creator && activeAddress === creator) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdminStatus();
    }, [activeAddress]);

    const handleAddTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!teacherAddress || teacherAddress.length !== 58) {
            setMessage({ type: 'error', text: 'Please enter a valid Algorand address (58 characters)' });
            return;
        }

        try {
            setProcessing(true);
            setMessage(null);

            const txId = await addTeacher(ATTENDANCE_APP_ID, teacherAddress);
            
            setMessage({ 
                type: 'success', 
                text: `Teacher authorized successfully! Transaction: ${txId.slice(0, 8)}...` 
            });
            setTeacherAddress('');
        } catch (error: any) {
            console.error('Error adding teacher:', error);
            setMessage({ 
                type: 'error', 
                text: error.message || 'Failed to authorize teacher. Make sure they have opted in first.' 
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveTeacher = async (address: string) => {
        if (!confirm(`Are you sure you want to remove teacher authorization for ${address.slice(0, 8)}...?`)) {
            return;
        }

        try {
            setProcessing(true);
            setMessage(null);

            const txId = await removeTeacher(ATTENDANCE_APP_ID, address);
            
            setMessage({ 
                type: 'success', 
                text: `Teacher removed successfully! Transaction: ${txId.slice(0, 8)}...` 
            });
        } catch (error: any) {
            console.error('Error removing teacher:', error);
            setMessage({ 
                type: 'error', 
                text: error.message || 'Failed to remove teacher authorization' 
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleCheckTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!checkAddress || checkAddress.length !== 58) {
            setMessage({ type: 'error', text: 'Please enter a valid Algorand address (58 characters)' });
            return;
        }

        try {
            setChecking(true);
            setMessage(null);

            const teacherStatus = await isTeacher(checkAddress, ATTENDANCE_APP_ID);
            
            setCheckResult({
                address: checkAddress,
                isTeacher: teacherStatus
            });
        } catch (error: any) {
            console.error('Error checking teacher status:', error);
            setMessage({ 
                type: 'error', 
                text: error.message || 'Failed to check teacher status' 
            });
        } finally {
            setChecking(false);
        }
    };

    const loadUsers = async () => {
        try {
            setLoadingUsers(true);
            const accounts = await getOptedInAccounts(ATTENDANCE_APP_ID);
            setUsers(accounts);
            setShowUsers(true);
        } catch (error) {
            console.error('Error loading users:', error);
            setMessage({ type: 'error', text: 'Failed to load users' });
        } finally {
            setLoadingUsers(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader className="w-12 h-12 text-emerald-600 animate-spin" />
            </div>
        );
    }

    if (!activeAddress) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
                    <Shield className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        Admin Panel
                    </h2>
                    <p className="text-slate-600 mb-6">
                        Connect your wallet to access the admin panel
                    </p>
                    <WalletButton />
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
                    <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        Access Denied
                    </h2>
                    <p className="text-slate-600 mb-2">
                        Only the contract creator can access the admin panel
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                        Your wallet: {activeAddress.slice(0, 8)}...{activeAddress.slice(-8)}
                    </p>
                    <a
                        href="/"
                        className="inline-block px-6 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
                    >
                        Go to Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-8 h-8 text-emerald-600" />
                            <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
                        </div>
                        <WalletButton />
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Status Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg border ${
                        message.type === 'success' 
                            ? 'bg-green-50 border-green-200 text-green-800' 
                            : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                        {message.text}
                    </div>
                )}

                {/* Add Teacher Section */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <UserPlus className="w-6 h-6 text-emerald-600" />
                        <h2 className="text-xl font-semibold text-slate-900">Authorize Teacher</h2>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                        <p className="text-sm text-blue-900 font-medium mb-2">Important:</p>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Teacher must opt-in to the app first (via student page or teacher dashboard)</li>
                            <li>Enter their wallet address below</li>
                            <li>Click "Authorize Teacher"</li>
                            <li>Sign the transaction in your wallet</li>
                        </ol>
                    </div>

                    <form onSubmit={handleAddTeacher} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Teacher Wallet Address
                            </label>
                            <input
                                type="text"
                                value={teacherAddress}
                                onChange={(e) => setTeacherAddress(e.target.value)}
                                placeholder="Enter 58-character Algorand address"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm"
                                disabled={processing}
                                maxLength={58}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {teacherAddress.length}/58 characters
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={processing || !teacherAddress}
                            className="w-full px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Authorize Teacher
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Check Teacher Status Section */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Search className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-semibold text-slate-900">Check Teacher Status</h2>
                    </div>

                    <form onSubmit={handleCheckTeacher} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Wallet Address to Check
                            </label>
                            <input
                                type="text"
                                value={checkAddress}
                                onChange={(e) => setCheckAddress(e.target.value)}
                                placeholder="Enter 58-character Algorand address"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                disabled={checking}
                                maxLength={58}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={checking || !checkAddress}
                            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {checking ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" />
                                    Check Status
                                </>
                            )}
                        </button>
                    </form>

                    {checkResult && (
                        <div className={`mt-4 p-4 rounded-lg border ${
                            checkResult.isTeacher
                                ? 'bg-green-50 border-green-200'
                                : 'bg-yellow-50 border-yellow-200'
                        }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {checkResult.isTeacher ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-yellow-600" />
                                )}
                                <span className={`font-medium ${
                                    checkResult.isTeacher ? 'text-green-900' : 'text-yellow-900'
                                }`}>
                                    {checkResult.isTeacher ? 'Authorized Teacher' : 'Not Authorized'}
                                </span>
                            </div>
                            <p className="text-sm font-mono text-slate-700">
                                {checkResult.address}
                            </p>
                            {!checkResult.isTeacher && (
                                <button
                                    onClick={() => {
                                        setTeacherAddress(checkResult.address);
                                        setCheckResult(null);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Authorize this teacher →
                                </button>
                            )}
                            {checkResult.isTeacher && (
                                <button
                                    onClick={() => handleRemoveTeacher(checkResult.address)}
                                    disabled={processing}
                                    className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                                >
                                    Remove authorization
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-6">
                    <h3 className="font-semibold text-slate-900 mb-3">Admin Information</h3>
                    <div className="space-y-2 text-sm text-slate-700">
                        <p><span className="font-medium">Your Role:</span> Contract Creator (Admin)</p>
                        <p><span className="font-medium">App ID:</span> {ATTENDANCE_APP_ID}</p>
                        <p><span className="font-medium">Your Address:</span> <span className="font-mono text-xs">{activeAddress}</span></p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-300">
                        <p className="text-xs text-slate-600">
                            As the admin, you can authorize and remove teachers. Teachers can create and manage attendance sessions.
                        </p>
                    </div>
                </div>

                {/* User List Section */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-900">All Users</h2>
                        <button
                            onClick={loadUsers}
                            disabled={loadingUsers}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {loadingUsers ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                'Load Users'
                            )}
                        </button>
                    </div>

                    {showUsers && users.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left p-3 font-medium text-slate-700">Address</th>
                                        <th className="text-center p-3 font-medium text-slate-700">Role</th>
                                        <th className="text-center p-3 font-medium text-slate-700">Checked In</th>
                                        <th className="text-center p-3 font-medium text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {users.map((user, index) => (
                                        <tr key={index} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                <span className="font-mono text-xs">
                                                    {user.address.slice(0, 8)}...{user.address.slice(-6)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                {user.is_teacher === 1 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Teacher
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                                                        Student
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {user.checked_in === 1 ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {user.is_teacher === 1 ? (
                                                    <button
                                                        onClick={() => handleRemoveTeacher(user.address)}
                                                        disabled={processing}
                                                        className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                                                    >
                                                        Remove
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setTeacherAddress(user.address);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        Make Teacher
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 text-sm text-slate-600">
                                Total users: {users.length} ({users.filter(u => u.is_teacher === 1).length} teachers, {users.filter(u => u.is_teacher !== 1).length} students)
                            </div>
                        </div>
                    )}

                    {showUsers && users.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            No users have opted into the app yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
