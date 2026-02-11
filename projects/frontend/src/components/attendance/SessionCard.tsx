import React from 'react';
import { Clock, Users } from 'lucide-react';

interface SessionCardProps {
    sessionId: string;
    sessionName: string;
    isActive: boolean;
    attendanceCount: number;
    endRound?: number;
    endTime?: number; // Keep for backward compatibility
    onClick?: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
    sessionId,
    sessionName,
    isActive,
    attendanceCount,
    endRound,
    endTime,
    onClick,
}) => {
    const getTimeRemaining = () => {
        // If using round-based timing
        if (endRound) {
            // Approximate: 3 seconds per round
            // We can't get exact current round from frontend without API call
            // So we'll just show the end round number
            return `Ends at round ${endRound}`;
        }
        
        // Fallback to timestamp-based (old system)
        if (endTime) {
            const now = Math.floor(Date.now() / 1000);
            const remaining = endTime - now;

            if (remaining <= 0) return 'Expired';

            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);

            if (hours > 0) return `${hours}h ${minutes}m remaining`;
            return `${minutes}m remaining`;
        }
        
        return 'Active';
    };

    return (
        <div
            onClick={onClick}
            className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">{sessionName}</h3>
                    <p className="text-sm font-mono text-slate-500 mt-1">{sessionId}</p>
                </div>
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}
                >
                    {isActive ? 'Active' : 'Expired'}
                </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{attendanceCount} students</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{getTimeRemaining()}</span>
                </div>
            </div>
        </div>
    );
};
