import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { WalletButton } from '../components/attendance/WalletButton';
import { QRDisplay } from '../components/attendance/QRDisplay';
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { SessionCard } from '../components/attendance/SessionCard';
import { PlusCircle, LayoutDashboard, FileText, Shield, Loader } from 'lucide-react';
import { useAttendance } from '../utils/useAttendance';
import { ATTENDANCE_APP_ID } from '../utils/algorand';

export const TeacherDashboard: React.FC = () => {
    const { activeAddress } = useWallet();
    const { createSession, getSessionInfo } = useAttendance();

    const [activeView, setActiveView] = React.useState<'create' | 'active' | 'records'>('create');
    const [sessionId, setSessionId] = React.useState('');
    const [sessionName, setSessionName] = React.useState('');
    const [duration, setDuration] = React.useState('3600');
    const [currentSession, setCurrentSession] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    // Load session info on mount
    React.useEffect(() => {
        loadSessionInfo();
    }, []);

    const loadSessionInfo = async () => {
        try {
            const sessionInfo = await getSessionInfo(ATTENDANCE_APP_ID);
            if (sessionInfo && sessionInfo.is_active === 1) {
                setCurrentSession({
                    sessionId: sessionInfo.session_id,
                    sessionName: sessionInfo.session_name,
                    appId: ATTENDANCE_APP_ID,
                    endTime: sessionInfo.end_time,
                    totalAttendance: sessionInfo.total_attendance || 0,
                });
            }
        } catch (err) {
            console.error('Error loading session:', err);
        }
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeAddress) {
            setError('Please connect your wallet first');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const durationNum = parseInt(duration);
            await createSession(ATTENDANCE_APP_ID, sessionId, sessionName, durationNum);

            // Reload session info
            await loadSessionInfo();

            setLoading(false);
            setActiveView('active');
        } catch (err: any) {
            console.error('Create session error:', err);
            setError(err.message || 'Failed to create session');
            setLoading(false);
        }
    };

    // Mock attendance data - in production, fetch from blockchain
    const mockAttendance = currentSession ? [
        {
            wallet: 'ZTQD36LLS2G4W6472YIDEBGARIWBK6MYTT25PTSFSMTBE5GSQIRPO53GHY',
            timestamp: Math.floor(Date.now() / 1000),
            riskScore: 0.15,
            verified: true,
        },
    ] : [];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-8 h-8 text-emerald-600" />
                            <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
                        </div>
                        <WalletButton />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <nav className="space-y-2">
                            <button
                                onClick={() => setActiveView('create')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors ${activeView === 'create'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                <PlusCircle className="w-5 h-5" />
                                Create Session
                            </button>
                            <button
                                onClick={() => setActiveView('active')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors ${activeView === 'active'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                Active Sessions
                            </button>
                            <button
                                onClick={() => setActiveView('records')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors ${activeView === 'records'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                <FileText className="w-5 h-5" />
                                Attendance Records
                            </button>
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Create Session View */}
                        {activeView === 'create' && (
                            <>
                                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                                    <h2 className="text-xl font-semibold text-slate-900 mb-4">
                                        Create New Session
                                    </h2>

                                    {!activeAddress && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                                            <p className="text-sm text-yellow-800">
                                                Please connect your wallet to create a session
                                            </p>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                            <p className="text-sm text-red-800">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleCreateSession} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Session ID
                                            </label>
                                            <input
                                                type="text"
                                                value={sessionId}
                                                onChange={(e) => setSessionId(e.target.value)}
                                                placeholder="e.g., CS101_2026_02_11"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Session Name
                                            </label>
                                            <input
                                                type="text"
                                                value={sessionName}
                                                onChange={(e) => setSessionName(e.target.value)}
                                                placeholder="e.g., Computer Science 101"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Duration (seconds)
                                            </label>
                                            <input
                                                type="number"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                placeholder="3600"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                required
                                                disabled={loading}
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                Default: 3600 seconds (1 hour)
                                            </p>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading || !activeAddress}
                                            className="w-full px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader className="w-4 h-4 animate-spin" />
                                                    Creating Session...
                                                </>
                                            ) : (
                                                'Create Session'
                                            )}
                                        </button>
                                    </form>
                                </div>

                                {/* QR Code Display */}
                                {currentSession && (
                                    <QRDisplay
                                        sessionId={currentSession.sessionId}
                                        appId={currentSession.appId}
                                        sessionName={currentSession.sessionName}
                                    />
                                )}
                            </>
                        )}

                        {/* Active Sessions View */}
                        {activeView === 'active' && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-slate-900">Active Sessions</h2>
                                {currentSession ? (
                                    <>
                                        <SessionCard
                                            sessionId={currentSession.sessionId}
                                            sessionName={currentSession.sessionName}
                                            isActive={true}
                                            attendanceCount={currentSession.totalAttendance}
                                            endTime={currentSession.endTime}
                                        />
                                        <QRDisplay
                                            sessionId={currentSession.sessionId}
                                            appId={currentSession.appId}
                                            sessionName={currentSession.sessionName}
                                        />
                                    </>
                                ) : (
                                    <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                                        <p className="text-slate-500">No active sessions</p>
                                        <button
                                            onClick={() => setActiveView('create')}
                                            className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
                                        >
                                            Create a session
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Attendance Records View */}
                        {activeView === 'records' && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-slate-900">Attendance Records</h2>
                                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                    <AttendanceTable records={mockAttendance} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
