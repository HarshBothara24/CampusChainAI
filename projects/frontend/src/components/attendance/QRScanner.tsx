import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

/**
 * QR Scanner Component
 * Uses device camera to scan QR codes with html5-qrcode library
 */
export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const [error, setError] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const qrCodeRegionId = 'qr-reader';

    useEffect(() => {
        startScanner();
        return () => {
            stopScanner();
        };
    }, []);

    const startScanner = async () => {
        try {
            setError('');
            setIsScanning(true);

            // Initialize scanner
            const html5QrCode = new Html5Qrcode(qrCodeRegionId);
            scannerRef.current = html5QrCode;

            // Start scanning
            await html5QrCode.start(
                { facingMode: 'environment' }, // Use back camera
                {
                    fps: 10, // Frames per second
                    qrbox: { width: 250, height: 250 }, // Scanning box size
                },
                (decodedText) => {
                    // Success callback
                    console.log('QR Code detected:', decodedText);
                    onScan(decodedText);
                    stopScanner();
                },
                (errorMessage) => {
                    // Error callback (called continuously while scanning)
                    // We don't show these errors as they're just "no QR found" messages
                }
            );
        } catch (err: any) {
            console.error('Scanner start error:', err);
            setIsScanning(false);
            
            if (err.name === 'NotAllowedError') {
                setError('Camera permission denied. Please allow camera access and try again.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found on this device.');
            } else {
                setError('Unable to access camera. Please check permissions.');
            }
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
        setIsScanning(false);
    };

    const handleClose = async () => {
        await stopScanner();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
            <div className="relative w-full h-full max-w-2xl flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-b from-black to-transparent p-4 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <Camera className="w-6 h-6" />
                            <h2 className="text-lg font-semibold">Scan QR Code</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                {/* Scanner Container */}
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full max-w-md">
                        {/* QR Reader Element */}
                        <div id={qrCodeRegionId} className="rounded-lg overflow-hidden" />
                        
                        {/* Scanning Status */}
                        {isScanning && !error && (
                            <div className="mt-4 text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium">Scanning...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="absolute bottom-24 left-4 right-4 bg-red-500 text-white p-4 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium">{error}</p>
                            <button
                                onClick={handleClose}
                                className="mt-2 text-sm underline"
                            >
                                Enter details manually instead
                            </button>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-gradient-to-t from-black to-transparent p-6">
                    <p className="text-white text-center text-sm mb-4">
                        Position the QR code within the frame to scan
                    </p>
                    <button
                        onClick={handleClose}
                        className="w-full px-4 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                    >
                        Enter Session ID Manually
                    </button>
                </div>
            </div>
        </div>
    );
};
