import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { WalletButton } from '../components/attendance/WalletButton';
import { QRScanner } from '../components/attendance/QRScanner';
import { CheckCircle, QrCode, Shield, Loader, AlertCircle, Keyboard, Camera } from 'lucide-react';
import { useAttendance } from '../utils/useAttendance';
import { ATTENDANCE_APP_ID } from '../utils/algorand';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import algosdk from 'algosdk';

type FlowState = 'connect' | 'scan' | 'confirm' | 'processing' | 'success' | 'error';

export const StudentPage: React.FC = () => {
    const { activeAddress } = useWallet();
    const { optIn, markAttendance, getAttendanceRecord } = useAttendance();

    const [flowState, setFlowState] = React.useState<FlowState>('connect');
    const [sessionId, setSessionId] = React.useState('');
    const [appId, setAppId] = React.useState(ATTENDANCE_APP_ID.toString());
    const [txId, setTxId] = React.useState('');
    const [error, setError] = React.useState('');
    const [needsOptIn, setNeedsOptIn] = React.useState(false);
    const [showScanner, setShowScanner] = React.useState(false);
    const [showManualInput, setShowManualInput] = React.useState(false);

    React.useEffect(() => {
        if (activeAddress && flowState === 'connect') {
            setFlowState('scan');
        }
    }, [activeAddress, flowState]);

    const handleQRScan = async (data: string) => {
        try {
            const qrData = JSON.parse(data);
            setSessionId(qrData.sessionId || '');
            setAppId(qrData.appId?.toString() || ATTENDANCE_APP_ID.toString());
            setShowScanner(false);
            setShowManualInput(false);
            
            // Check if user needs to opt-in
            const appIdNum = parseInt(qrData.appId || ATTENDANCE_APP_ID);
            const attendance = await getAttendanceRecord(activeAddress!, appIdNum);

            if (!attendance) {
                setNeedsOptIn(true);
            } else {
                setNeedsOptIn(false);
            }

            setFlowState('confirm');
        } catch (err) {
            console.error('QR scan error:', err);
            setError('Invalid QR code format');
            setShowScanner(false);
        }
    };

    const handleManualInput = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sessionId && appId && activeAddress) {
            // Check if user needs to opt-in first
            const appIdNum = parseInt(appId);
            const attendance = await getAttendanceRecord(activeAddress, appIdNum);

            if (!attendance) {
                setNeedsOptIn(true);
            }

            setFlowState('confirm');
        }
    };

    const handleOptIn = async () => {
        try {
            setFlowState('processing');
            setError('');

            const appIdNum = parseInt(appId);
            const transactionId = await optIn(appIdNum);

            setTxId(transactionId);
            setNeedsOptIn(false);
            setFlowState('confirm');
        } catch (err: any) {
            console.error('Opt-in error:', err);
            
            // Check if error is "already opted in"
            if (err.message?.includes('already opted in') || err.message?.includes('has already opted')) {
                console.log('User already opted in, proceeding...');
                setNeedsOptIn(false);
                setFlowState('confirm');
            } else {
                setError(err.message || 'Failed to opt-in to the app');
                setFlowState('error');
            }
        }
    };

    const handleMarkAttendance = async () => {
        try {
            setFlowState('processing');
            setError('');

            if (!activeAddress) {
                throw new Error('No active wallet connected');
            }

            const appIdNum = parseInt(appId);

            // Get current round from blockchain
            const algodConfig = getAlgodConfigFromViteEnvironment();
            const algodClient = new algosdk.Algodv2(
                String(algodConfig.token || ''),
                algodConfig.server,
                String(algodConfig.port || 443)
            );
            
            const status = await algodClient.status().do();
            const qrRound = Number(status.lastRound);

            // Generate wallet-bound hash: SHA256(sessionId + qrRound + studentAddress)
            const sessionIdBytes = new TextEncoder().encode(sessionId);
            
            // Convert round to 8-byte big-endian
            const roundBytes = new Uint8Array(8);
            const view = new DataView(roundBytes.buffer);
            view.setBigUint64(0, BigInt(qrRound), false);
            
            // Decode student address to bytes
            const studentAddressBytes = algosdk.decodeAddress(activeAddress).publicKey;
            
            // Concatenate all components
            const combined = new Uint8Array(
                sessionIdBytes.length + roundBytes.length + studentAddressBytes.length
            );
            combined.set(sessionIdBytes, 0);
            combined.set(roundBytes, sessionIdBytes.length);
            combined.set(studentAddressBytes, sessionIdBytes.length + roundBytes.length);
            
            // Compute SHA256 hash
            const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
            const qrHash = new Uint8Array(hashBuffer);

            // Call secure mark attendance with 4 args
            const transactionId = await markAttendance(appIdNum, sessionId, qrRound, qrHash);

            setTxId(transactionId);
            setFlowState('success');
        } catch (err: any) {
            console.error('Mark attendance error:', err);
            setError(err.message || 'Failed to mark attendance');
            setFlowState('error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-8 h-8 text-emerald-600" />
                            <h1 className="text-2xl font-bold text-slate-900">Mark Attendance</h1>
                        </div>
                        <WalletButton />
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Connect Wallet State */}
                {flowState === 'connect' && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-12 text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Connect Your Wallet</h2>
                        <p className="text-slate-600 mb-8">
                            Connect your Algorand wallet to mark attendance
                        </p>
                        <WalletButton />
                    </div>
                )}

                {/* Scan QR State */}
                {flowState === 'scan' && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <QrCode className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Mark Attendance</h2>
                            <p className="text-slate-600">
                                Scan the QR code or enter session details manually
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => setShowScanner(true)}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                <Camera className="w-5 h-5" />
                                Scan QR Code
                            </button>
                            
                            <button
                                onClick={() => setShowManualInput(!showManualInput)}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                <Keyboard className="w-5 h-5" />
                                Enter Session ID Manually
                            </button>
                        </div>

                        {/* Manual Input Form (Collapsible) */}
                        {showManualInput && (
                            <form onSubmit={handleManualInput} className="space-y-4 pt-4 border-t border-slate-200">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Session ID
                                    </label>
                                    <input
                                        type="text"
                                        value={sessionId}
                                        onChange={(e) => setSessionId(e.target.value)}
                                        placeholder="e.g., GenAI_11_02_2026"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        required
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Enter the session ID provided by your teacher
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
                                >
                                    Continue
                                </button>
                            </form>
                        )}

                        {/* QR Scanner Modal */}
                        {showScanner && (
                            <QRScanner
                                onScan={handleQRScan}
                                onClose={() => setShowScanner(false)}
                            />
                        )}
                    </div>
                )}

                {/* Confirm State */}
                {flowState === 'confirm' && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-6">
                            {needsOptIn ? 'Opt-In Required' : 'Confirm Attendance'}
                        </h2>

                        {needsOptIn && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                                <p className="text-sm text-yellow-800">
                                    You need to opt-in to this app before marking attendance. This is a one-time action.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between py-3 border-b border-slate-200">
                                <span className="text-slate-600">Session ID</span>
                                <span className="font-mono text-slate-900">{sessionId}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-slate-200">
                                <span className="text-slate-600">Your Wallet</span>
                                <span className="font-mono text-slate-900 text-sm">
                                    {activeAddress?.slice(0, 8)}...{activeAddress?.slice(-6)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={needsOptIn ? handleOptIn : handleMarkAttendance}
                            className="w-full px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {needsOptIn ? 'Opt-In to App' : 'Mark Attendance'}
                        </button>
                    </div>
                )}

                {/* Processing State */}
                {flowState === 'processing' && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-12 text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader className="w-8 h-8 text-emerald-600 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
                            Processing Transaction...
                        </h2>
                        <p className="text-slate-600">
                            Please sign the transaction in your wallet and wait for confirmation
                        </p>
                    </div>
                )}

                {/* Success State */}
                {flowState === 'success' && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-12 text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
                            Attendance Marked Successfully!
                        </h2>
                        <p className="text-slate-600 mb-8">
                            Your attendance has been recorded on the Algorand blockchain
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8">
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Session</span>
                                    <span className="font-mono text-slate-900">{sessionId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Status</span>
                                    <span className="text-emerald-600 font-medium">Verified ✓</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Transaction</span>
                                    <a
                                        href={`https://testnet.algoexplorer.io/tx/${txId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-600 hover:text-emerald-700 font-mono text-xs"
                                    >
                                        {txId.slice(0, 8)}...
                                    </a>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setFlowState('scan');
                                setSessionId('');
                                setAppId(ATTENDANCE_APP_ID.toString());
                                setTxId('');
                            }}
                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                            Mark Another Attendance
                        </button>
                    </div>
                )}

                {/* Error State */}
                {flowState === 'error' && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-12 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
                            Transaction Failed
                        </h2>
                        <p className="text-slate-600 mb-4">{error}</p>

                        <button
                            onClick={() => setFlowState('scan')}
                            className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};