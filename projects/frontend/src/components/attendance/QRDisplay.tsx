import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';

interface QRDisplayProps {
    sessionId: string;
    appId: number;
    sessionName: string;
}

export const QRDisplay: React.FC<QRDisplayProps> = ({ sessionId, appId, sessionName }) => {
    const [copied, setCopied] = React.useState(false);

    const qrData = JSON.stringify({
        appId,
        sessionId,
    });

    const handleCopy = () => {
        navigator.clipboard.writeText(sessionId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{sessionName}</h3>
                <p className="text-sm text-slate-500 mb-6">Scan to mark attendance</p>

                {/* QR Code */}
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white border-2 border-slate-200 rounded-lg">
                        <QRCodeSVG value={qrData} size={256} level="H" />
                    </div>
                </div>

                {/* Session Details */}
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-mono text-slate-700">{sessionId}</span>
                        <button
                            onClick={handleCopy}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title="Copy session ID"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">App ID: {appId}</p>
                </div>
            </div>
        </div>
    );
};
