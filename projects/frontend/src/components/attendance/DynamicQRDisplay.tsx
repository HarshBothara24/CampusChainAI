import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Clock, Shield, Users } from 'lucide-react';
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs';
import algosdk from 'algosdk';

interface DynamicQRDisplayProps {
    sessionId: string;
    appId: number;
    sessionName: string;
}

/**
 * Dynamic QR Display for Anti-Proxy Attendance
 * 
 * How it works:
 * 1. Teacher displays ONE QR code that refreshes every 12 seconds
 * 2. QR contains: {sessionId, appId, qrRound}
 * 3. Multiple students scan the SAME QR
 * 4. Each student's wallet generates their OWN hash: SHA256(sessionId + qrRound + studentAddress)
 * 5. Contract validates the hash matches the student's wallet
 * 
 * Security:
 * - QR expires after 5 rounds (~15 seconds)
 * - Each student must generate hash with THEIR wallet address
 * - Sharing QR doesn't help - hash won't match different wallet
 */
export const DynamicQRDisplay: React.FC<DynamicQRDisplayProps> = ({
    sessionId,
    appId,
    sessionName,
}) => {
    const [qrDataURL, setQrDataURL] = useState<string>('');
    const [currentRound, setCurrentRound] = useState<number>(0);
    const [expiresIn, setExpiresIn] = useState<number>(60);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    // Initialize Algod client
    const algodConfig = getAlgodConfigFromViteEnvironment();
    const algodClient = new algosdk.Algodv2(
        String(algodConfig.token || ''),
        algodConfig.server,
        String(algodConfig.port || '')
    );

    /**
     * Generate dynamic QR code with current round
     * QR Payload: {sessionId, appId, qrRound}
     * Note: NO hash in QR - students generate it locally with their wallet
     */
    const generateDynamicQR = async () => {
        try {
            setIsGenerating(true);

            // Get current round from blockchain
            const status = await algodClient.status().do();
            const round = Number(status['lastRound']);
            setCurrentRound(round);

            // Create QR payload (NO student address, NO hash)
            const qrPayload = {
                sessionId,
                appId,
                qrRound: round,
                timestamp: Date.now(),
            };

            // Generate QR code
            const qrString = JSON.stringify(qrPayload);
            setQrDataURL(qrString);
            setExpiresIn(60); // Reset countdown to 60 seconds
        } catch (error) {
            console.error('Error generating dynamic QR:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate QR on mount
    useEffect(() => {
        generateDynamicQR();
    }, []);

    // Auto-refresh QR every 45 seconds (before 20-round expiry)
    useEffect(() => {
        const refreshInterval = setInterval(() => {
            generateDynamicQR();
        }, 45000); // 45 seconds

        return () => clearInterval(refreshInterval);
    }, [sessionId, appId]);

    // Countdown timer
    useEffect(() => {
        const countdownInterval = setInterval(() => {
            setExpiresIn((prev) => {
                if (prev <= 1) {
                    return 60; // Reset when it hits 0
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
                        Attendance QR Code
                    </h3>
                </div>
                <button
                    onClick={generateDynamicQR}
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
                <p className="text-sm text-slate-600">
                    <span className="font-medium">Current Round:</span> {currentRound}
                </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
                {qrDataURL ? (
                    <div className="relative">
                        <div className="p-4 bg-white border-4 border-emerald-600 rounded-lg">
                            <QRCodeSVG
                                value={qrDataURL}
                                size={280}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        {/* Expiry overlay */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Refreshes in {expiresIn}s
                        </div>
                    </div>
                ) : (
                    <div className="w-[280px] h-[280px] bg-slate-100 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Generating QR...</p>
                    </div>
                )}
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                <p className="text-xs text-blue-900 font-medium mb-1">
                    🔒 Anti-Proxy Security:
                </p>
                <ul className="text-xs text-blue-800 space-y-0.5">
                    <li>• QR refreshes every 45 seconds</li>
                    <li>• Each student generates unique hash with their wallet</li>
                    <li>• Sharing QR won't work - hash validation fails</li>
                    <li>• Verified on-chain</li>
                </ul>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-slate-50 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-slate-600" />
                    <p className="text-xs text-slate-600 font-medium">For Students:</p>
                </div>
                <ol className="text-xs text-slate-600 space-y-0.5 list-decimal list-inside">
                    <li>Scan this QR code with your device</li>
                    <li>Your wallet will generate a unique hash</li>
                    <li>Confirm the transaction to mark attendance</li>
                    <li>Each student must scan with their own wallet</li>
                </ol>
            </div>
        </div>
    );
};
