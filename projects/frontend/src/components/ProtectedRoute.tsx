import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { isTeacher } from '../utils/auth';
import { Shield, AlertTriangle } from 'lucide-react';

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

    // If teacher authorization is required but user is not a teacher
    if (requireTeacher && !isTeacher(activeAddress)) {
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
                    <p className="text-sm text-slate-500 mb-6">
                        Your wallet: <span className="font-mono text-xs">{activeAddress.slice(0, 8)}...{activeAddress.slice(-8)}</span>
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

    // User is authorized, render the protected content
    return <>{children}</>;
};
