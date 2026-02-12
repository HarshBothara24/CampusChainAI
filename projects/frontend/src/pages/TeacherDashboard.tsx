import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { WalletButton } from '../components/attendance/WalletButton';
import { DynamicQRDisplay } from '../components/attendance/DynamicQRDisplay';
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { SessionCard } from '../components/attendance/SessionCard';
import { PlusCircle, LayoutDashboard, FileText, Shield, Loader, Users } from 'lucide-react';
import { useAttendance } from '../utils/useAttendance';
import { ATTENDANCE_APP_ID } from '../utils/algorand';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import algosdk from 'algosdk';

export const TeacherDashboard: React.FC = () => {
    const { activeAddress } = useWallet();
    const { createSession, getSessionInfo, getOptedInAccounts } = useAttendance();

    const [activeView, setActiveView] = React.useState<'create' | 'active' | 'records'>('create');
    const [sessionId, setSessionId] = React.useState('');
    const [sessionName, setSessionName] = React.useState('');
    const [duration, setDuration] = React.useState('60'); // Changed to minutes
    const [attendanceWindow, setAttendanceWindow] = React.useState('5'); // New: attendance window in minutes
    const [currentSession, setCurrentSession] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    const [attendanceRecords, setAttendanceRecords] = React.useState<any[]>([]);

    // Load session info on mount
    React.useEffect(() => {
        loadSessionInfo();
    }, []);

    // Load attendance records when viewing records tab
    React.useEffect(() => {
        if (activeView === 'records' && currentSession) {
            loadAttendanceRecords();
        }
    }, [activeView, currentSession]);

    const loadAttendanceRecords = async () => {
        try {
            const accounts = await getOptedInAccounts(ATTENDANCE_APP_ID);
            
            // Filter accounts that have checked_in = 1
            const attendedStudents = accounts.filter((account: any) => account.checked_in === 1);
            
            // Get algod client to fetch block timestamps
            const algodConfig = getAlgodConfigFromViteEnvironment();
            const algodClient = new algosdk.Algodv2(
                String(algodConfig.token || ''),
                algodConfig.server,
                String(algodConfig.port || 443)
            );
            
            // Fetch timestamps for each check-in round
            const recordsWithTimestamps = await Promise.all(
                attendedStudents.map(async (account: any) => {
                    try {
                        const checkInRound = account.check_in_round || 0;
                        
                        // Fetch block info to get timestamp
                        if (checkInRound > 0) {
                            const block = await algodClient.block(checkInRound).do();
                            // The timestamp is at block.ts (not block.block.ts)
                            const timestamp = (block as any).ts || Math.floor(Date.now() / 1000);
                            
                            return {
                                wallet: account.address,
                                timestamp: timestamp,
                                round: checkInRound,
                                riskScore: 0,
                                verified: true,
                            };
                        }
                        
                        return {
                            wallet: account.address,
                            timestamp: Math.floor(Date.now() / 1000),
                            round: checkInRound,
                            riskScore: 0,
                            verified: true,
                        };
                    } catch (err) {
                        console.error(`Error fetching block for round ${account.check_in_round}:`, err);
                        return {
                            wallet: account.address,
                            timestamp: Math.floor(Date.now() / 1000),
                            round: account.check_in_round || 0,
                            riskScore: 0,
                            verified: true,
                        };
                    }
                })
            );
            
            // Sort by timestamp (most recent first)
            recordsWithTimestamps.sort((a, b) => b.timestamp - a.timestamp);
            
            setAttendanceRecords(recordsWithTimestamps);
        } catch (err) {
            console.error('Error loading attendance records:', err);
            setAttendanceRecords([]);
        }
    };

    const loadSessionInfo = async () => {
        try {
            const sessionInfo = await getSessionInfo(ATTENDANCE_APP_ID);
            console.log('Loaded session info:', sessionInfo);
            
            // Convert BigInt to Number for comparison
            const isActive = typeof sessionInfo?.is_active === 'bigint' 
                ? Number(sessionInfo.is_active) 
                : sessionInfo?.is_active;
            
            if (sessionInfo && isActive === 1) {
                setCurrentSession({
                    sessionId: sessionInfo.session_id,
                    sessionName: sessionInfo.session_name,
                    appId: ATTENDANCE_APP_ID,
                    startRound: typeof sessionInfo.start_round === 'bigint' 
                        ? Number(sessionInfo.start_round) 
                        : sessionInfo.start_round,
                    endRound: typeof sessionInfo.end_round === 'bigint' 
                        ? Number(sessionInfo.end_round) 
                        : sessionInfo.end_round,
                    totalAttendance: typeof sessionInfo.total_attendance === 'bigint' 
                        ? Number(sessionInfo.total_attendance) 
                        : (sessionInfo.total_attendance || 0),
                });
                console.log('✅ Active session set successfully');
            } else {
                console.log('No active session found or session is inactive');
                setCurrentSession(null);
            }
        } catch (err) {
            console.error('Error loading session:', err);
            setCurrentSession(null);
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
            setSuccess('');

            // Convert minutes to seconds for the contract
            const durationSeconds = parseInt(duration) * 60;
            const attendanceWindowSeconds = parseInt(attendanceWindow) * 60;
            
            console.log('Creating session with:', {
                appId: ATTENDANCE_APP_ID,
                sessionId,
                sessionName,
                durationSeconds,
                attendanceWindowSeconds
            });
            
            try {
                const txId = await createSession(
                    ATTENDANCE_APP_ID, 
                    sessionId, 
                    sessionName, 
                    durationSeconds,
                    attendanceWindowSeconds  // Pass attendance window
                );

                console.log('✅ Session created successfully! Transaction:', txId);
                
                // Wait for blockchain confirmation
                console.log('Waiting 4 seconds for blockchain confirmation...');
                await new Promise(resolve => setTimeout(resolve, 4000));

                // Reload session info
                console.log('Reloading session info...');
                const newSessionInfo = await getSessionInfo(ATTENDANCE_APP_ID);
                
                // Manually update state with new session
                if (newSessionInfo && Number(newSessionInfo.is_active) === 1) {
                    const newSession = {
                        sessionId: newSessionInfo.session_id,
                        sessionName: newSessionInfo.session_name,
                        appId: ATTENDANCE_APP_ID,
                        startRound: Number(newSessionInfo.start_round),
                        endRound: Number(newSessionInfo.end_round),
                        attendanceEndRound: Number(newSessionInfo.attendance_end_round),
                        totalAttendance: Number(newSessionInfo.total_attendance || 0),
                    };
                    
                    setCurrentSession(newSession);
                    
                    // Verify the new session was created
                    if (newSession.sessionId === sessionId) {
                        console.log('✅ New session verified!');
                        setSuccess('Session created successfully!');
                    } else {
                        console.log('✅ Session created:', newSession.sessionId);
                        setSuccess(`Session "${newSession.sessionId}" created successfully!`);
                    }
                } else {
                    setSuccess('Session created! Refresh to see it.');
                }
                
                // Clear form
                setSessionId('');
                setSessionName('');
                setDuration('60');
                setAttendanceWindow('5');

                setLoading(false);
                setActiveView('active');
                
            } catch (createError: any) {
                console.error('❌ createSession threw error:', createError);
                throw createError; // Re-throw to be caught by outer catch
            }

        } catch (err: any) {
            console.error('❌ Create session error:', err);
            console.error('Error message:', err.message);
            console.error('Error stack:', err.stack);
            
            // Don't try to recover from pending transaction errors
            // Just show the error and let user try again
            if (err.message?.includes('txn dead') || err.message?.includes('outside of')) {
                setError('Transaction expired. Please approve faster in your wallet and try again.');
            } else if (err.message?.includes('pending') || err.message?.includes('4100')) {
                setError('Transaction in progress. Please wait 10 seconds and try again.');
            } else if (err.message?.includes('overspend')) {
                setError('Insufficient balance. Please ensure your wallet has enough ALGO.');
            } else if (err.message?.includes('logic eval error')) {
                setError('Contract error: ' + (err.message || 'Unknown contract error'));
            } else {
                setError(err.message || 'Failed to create session. Check console for details.');
            }
            
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

                                    {success && (
                                        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                                            <p className="text-sm text-green-800">{success}</p>
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
                                                Session Duration (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                placeholder="60"
                                                min="1"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                required
                                                disabled={loading}
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                How long the class/session will last (e.g., 60 minutes)
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Attendance Window (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                value={attendanceWindow}
                                                onChange={(e) => setAttendanceWindow(e.target.value)}
                                                placeholder="5"
                                                min="1"
                                                max={duration}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                required
                                                disabled={loading}
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                How long students have to mark attendance (e.g., 2-5 minutes)
                                            </p>
                                        </div>
                                        
                                        {/* Info box */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                            <p className="text-xs text-blue-900 font-medium mb-1">
                                                📋 Example:
                                            </p>
                                            <ul className="text-xs text-blue-800 space-y-0.5">
                                                <li>• Session Duration: 60 minutes (class length)</li>
                                                <li>• Attendance Window: 5 minutes (time to mark attendance)</li>
                                                <li>• Students must mark attendance within first 5 minutes</li>
                                            </ul>
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
                                    <DynamicQRDisplay
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
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-slate-900">Active Sessions</h2>
                                    <button
                                        onClick={loadSessionInfo}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors"
                                    >
                                        <Loader className="w-4 h-4" />
                                        Refresh
                                    </button>
                                </div>
                                {currentSession ? (
                                    <>
                                        <SessionCard
                                            sessionId={currentSession.sessionId}
                                            sessionName={currentSession.sessionName}
                                            isActive={true}
                                            attendanceCount={currentSession.totalAttendance}
                                            endRound={currentSession.endRound}
                                        />
                                        <DynamicQRDisplay
                                            sessionId={currentSession.sessionId}
                                            appId={currentSession.appId}
                                            sessionName={currentSession.sessionName}
                                        />
                                    </>
                                ) : (
                                    <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                                        <p className="text-slate-500 mb-2">No active sessions</p>
                                        <p className="text-xs text-slate-400 mb-4">
                                            If you just created a session, click Refresh above or wait a few seconds
                                        </p>
                                        <button
                                            onClick={() => setActiveView('create')}
                                            className="text-emerald-600 hover:text-emerald-700 font-medium"
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
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-slate-900">Attendance Records</h2>
                                    {currentSession && (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={loadAttendanceRecords}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                                            >
                                                <Loader className="w-4 h-4" />
                                                Refresh
                                            </button>
                                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                <Users className="w-5 h-5 text-emerald-600" />
                                                <span className="text-sm font-medium text-emerald-900">
                                                    {attendanceRecords.length} Students Marked
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {currentSession ? (
                                    <>
                                        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-xs text-slate-500">Session</p>
                                                    <p className="text-sm font-medium text-slate-900">{currentSession.sessionName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Session ID</p>
                                                    <p className="text-sm font-mono text-slate-900">{currentSession.sessionId}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Status</p>
                                                    <p className="text-sm font-medium text-emerald-600">Active</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">Total Attendance</p>
                                                    <p className="text-sm font-medium text-slate-900">{attendanceRecords.length}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                            <AttendanceTable records={attendanceRecords} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                                        <p className="text-slate-500">No active session</p>
                                        <button
                                            onClick={() => setActiveView('create')}
                                            className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
                                        >
                                            Create a session to view records
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
