import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { RefreshCw, Clock, Shield } from 'lucide-react';
import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs';

interface SecureQRDisplayProps {
    sessionId: string;
    appId: number;
    sessionName: string;
    studentAddress: string; // The specific student's wallet address
}

/**
 * Secure QR Display Component
 * Generates wallet-bound, round-specific QR codes that expire every 5 rounds (~15 seconds)
 * 
 * Security Features:
 * - QR is bound to specific student wallet address
 * - QR includes current round number
 * - QR hash = SHA256(session_id + round + student_address)
 * - Auto-refreshes every 12 seconds (before 5-round expiry)
 * - Cannot be shared between students
 */
export const SecureQRDisplay: React.FC<SecureQRDisplayProps> = ({
    sessionId,
    appId,
    sessionName,
    studentAddress,
}) => {
    const [qrDataURL, setQrDataURL] = useState<string>('');
    const [currentRound, setCurrentRound] = useState<number>(0);
    const [expiresIn, setExpiresIn] = useState<number>(15);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    // Initialize Algod client
    const algodConfig = getAlgodConfigFromViteEnvironment();
    const algodClient = new algosdk.Algodv2(
        algodConfig.token,
        algodConfig.server,
        algodConfig.port
    );

    /**
     * Generate wallet-bound QR code
     * QR Payload: {sessionId, appId, qrRound, qrHash, studentAddress}
     * qrHash = SHA256(sessionId + qrRound + studentAddress)
     */
    const generateSecureQR = async () => {
        try {
            setIsGenerating(true);

            // Get current round from blockchain
            const status = await algodClient.status().do();
            const round = status['last-round'];
            setCurrentRound(round);

            // Convert round to 8-byte big-endian format (uint64)
            const roundBytes = new Uint8Array(8);
            const view = new DataView(roundBytes.buffer);
            view.setBigUint64(0, BigInt(round), false); // false = big-endian

            // Decode student address to bytes (32 bytes)
            const studentAddressBytes = algosdk.decodeAddress(studentAddress).publicKey;

            // Compute hash: SHA256(sessionId + roundBytes + studentAddressBytes)
            const sessionIdBytes = new TextEncoder().encode(sessionId);
            
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

            // Create QR payload
            const qrPayload = {
                sessionId,
                appId,
                qrRound: round,
                qrHash: Buffer.from(qrHash).toString('base64'),
                studentAddress,
                timestamp: Date.now(),
            };

            // Generate QR code
            const qrString = JSON.stringify(qrPayload);
            const dataURL = await QRCode.toDataURL(qrString, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#047857', // emerald-700
                    light: '#FFFFFF',
                },
            });

            setQrDataURL(dataURL);
            setExpiresIn(15); // Reset countdown
        } catch (error) {
            console.error('Error generating secure QR:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate QR on mount and when student address changes
    useEffect(() => {
        if (studentAddress) {
            generateSecureQR();
        }
    }, [studentAddress]);

    // Auto-refresh QR every 12 seconds (before 5-round expiry)
    useEffect(() => {
        const refreshInterval = setInterval(() => {
            generateSecureQR();
        }, 12000); // 12 seconds

        return () => clearInterval(refreshInterval);
    }, [studentAddress]);

    // Countdown timer
    useEffect(() => {
        const countdownInterval = setInterval(() => {
            setExpiresIn((prev) => {
                if (prev <= 1) {
                    return 15; // Reset when it hits 0
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(countdownInterval);
    }, []);

    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-slate-900">
                        Secure QR Code
                    </h3>
                </div>
                <button
                    onClick={generateSecureQR}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Session Info */}
            <div className="mb-4 p-3 bg-slate-50 rounded-md">
                <p className="text-sm text-slate-600 mb-1">
                    <span className="font-medium">Session:</span> {sessionName}
                </p>
                <p className="text-sm text-slate-600 mb-1">
                    <span className="font-medium">Session ID:</span>{' '}
                    <span className="font-mono text-xs">{sessionId}</span>
                </p>
                <p className="text-sm text-slate-600 mb-1">
                    <span className="font-medium">Student:</span>{' '}
                    <span className="font-mono text-xs">
                        {studentAddress.slice(0, 8)}...{studentAddress.slice(-6)}
                    </span>
                </p>
                <p className="text-sm text-slate-600">
                    <span className="font-medium">Round:</span> {currentRound}
                </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
                {qrDataURL ? (
                    <div className="relative">
                        <img
                            src={qrDataURL}
                            alt="Secure Attendance QR Code"
                            className="rounded-lg border-4 border-emerald-600"
                        />
                        {/* Expiry overlay */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires in {expiresIn}s
                        </div>
                    </div>
                ) : (
                    <div className="w-[300px] h-[300px] bg-slate-100 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Generating QR...</p>
                    </div>
                )}
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs text-blue-900 font-medium mb-1">
                    🔒 Security Features:
                </p>
                <ul className="text-xs text-blue-800 space-y-0.5">
                    <li>• QR bound to your wallet address</li>
                    <li>• Expires every 15 seconds</li>
                    <li>• Cannot be shared or reused</li>
                    <li>• Verified on-chain</li>
                </ul>
            </div>

            {/* Instructions */}
            <div className="mt-4 p-3 bg-slate-50 rounded-md">
                <p className="text-xs text-slate-600 font-medium mb-1">Instructions:</p>
                <ol className="text-xs text-slate-600 space-y-0.5 list-decimal list-inside">
                    <li>Scan this QR code with your device</li>
                    <li>Confirm the transaction in your wallet</li>
                    <li>Attendance will be recorded on-chain</li>
                </ol>
            </div>
        </div>
    );
};
