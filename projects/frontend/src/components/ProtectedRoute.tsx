import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { Shield, AlertTriangle, Loader } from 'lucide-react';
import { useAttendance } from '../utils/useAttendance';
import { ATTENDANCE_APP_ID } from '../utils/algorand';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireTeacher?: boolean;
}

/**
 * Protected Route Component
 * Protects routes based on wallet connection and teacher authorization
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireTeacher = false
}) => {
    const { activeAddress } = useWallet();
    const { isTeacher, optIn, getAttendanceRecord } = useAttendance();
    
    const [loading, setLoading] = React.useState(true);
    const [authorized, setAuthorized] = React.useState(false);
    const [needsOptIn, setNeedsOptIn] = React.useState(false);
    const [optingIn, setOptingIn] = React.useState(false);
    const [error, setError] = React.useState('');

    // Check authorization status
    React.useEffect(() => {
        const checkAuthorization = async () => {
            if (!activeAddress || !requireTeacher) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                
                // Check if user has opted in
                const record = await getAttendanceRecord(activeAddress, ATTENDANCE_APP_ID);
                
                if (!record) {
                    // User hasn't opted in yet
                    setNeedsOptIn(true);
                    setAuthorized(false);
                } else {
                    // Check if user is authorized teacher
                    const teacherStatus = await isTeacher(activeAddress, ATTENDANCE_APP_ID);
                    setAuthorized(teacherStatus);
                    setNeedsOptIn(false);
                }
            } catch (err) {
                console.error('Error checking authorization:', err);
                setError('Failed to check authorization status');
            } finally {
                setLoading(false);
            }
        };

        checkAuthorization();
    }, [activeAddress, requireTeacher]);

    // Handle opt-in
    const handleOptIn = async () => {
        if (!activeAddress) return;

        try {
            setOptingIn(true);
            setError('');
            
            await optIn(ATTENDANCE_APP_ID);
            
            // Recheck authorization after opt-in
            const teacherStatus = await isTeacher(activeAddress, ATTENDANCE_APP_ID);
            setAuthorized(teacherStatus);
            setNeedsOptIn(false);
        } catch (err: any) {
            console.error('Opt-in error:', err);
            setError(err.message || 'Failed to opt-in');
        } finally {
            setOptingIn(false);
        }
    };

    // If wallet connection is required but not connected
    if (!activeAddress) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        Wallet Connection Required
                    </h2>
                    <p className="text-slate-600 mb-6">
                        Please connect your wallet to access this page.
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

    // Loading state
    if (loading && requireTeacher) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
                    <Loader className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Checking authorization...</p>
                </div>
            </div>
        );
    }

    // User needs to opt-in first
    if (requireTeacher && needsOptIn) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        Opt-In Required
                    </h2>
                    <p className="text-slate-600 mb-2">
                        You need to opt-in to the attendance app before accessing the teacher dashboard.
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                        Your wallet: <span className="font-mono text-xs">{activeAddress.slice(0, 8)}...{activeAddress.slice(-8)}</span>
                    </p>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        <button
                            onClick={handleOptIn}
                            disabled={optingIn}
                            className="w-full px-6 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {optingIn ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Opting In...
                                </>
                            ) : (
                                'Opt-In to App'
                            )}
                        </button>
                        <a
                            href="/"
                            className="block text-slate-600 hover:text-slate-900 text-sm"
                        >
                            Go to Home
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // If teacher authorization is required but user is not a teacher
    if (requireTeacher && !authorized) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        Unauthorized Access
                    </h2>
                    <p className="text-slate-600 mb-2">
                        This page is restricted to authorized teachers only.
                    </p>
                    <p className="text-sm text-slate-500 mb-4">
                        Your wallet: <span className="font-mono text-xs">{activeAddress.slice(0, 8)}...{activeAddress.slice(-8)}</span>
                    </p>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-left">
                        <p className="text-sm text-blue-900 font-medium mb-2">To get teacher access:</p>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Contact the admin with your wallet address</li>
                            <li>Admin will authorize you using the management script</li>
                            <li>Refresh this page after authorization</li>
                        </ol>
                    </div>
                    
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

    // User is authorized, render the protected content
    return <>{children}</>;
};
