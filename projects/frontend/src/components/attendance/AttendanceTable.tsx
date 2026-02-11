import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

interface AttendanceRecord {
    wallet: string;
    timestamp: number;
    riskScore: number;
    verified: boolean;
}

interface AttendanceTableProps {
    records: AttendanceRecord[];
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ records }) => {
    const formatWallet = (wallet: string) => {
        return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Student Wallet
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Risk Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {records.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                No attendance records yet
                            </td>
                        </tr>
                    ) : (
                        records.map((record, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                                    {formatWallet(record.wallet)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                    {formatTimestamp(record.timestamp)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <RiskBadge score={record.riskScore} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {record.verified ? (
                                        <span className="inline-flex items-center text-emerald-700">
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            <span className="text-sm font-medium">Verified</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-red-700">
                                            <XCircle className="w-4 h-4 mr-1" />
                                            <span className="text-sm font-medium">Flagged</span>
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
