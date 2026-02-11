import { useWallet } from '@txnlab/use-wallet-react';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from './network/getAlgoClientConfigs';

/**
 * Custom hook for attendance contract interactions
 * Uses @txnlab/use-wallet-react v4 API with AlgorandClient
 */
export const useAttendance = () => {
    const { activeAddress, transactionSigner } = useWallet();

    // Initialize AlgorandClient with the transaction signer
    const algodConfig = getAlgodConfigFromViteEnvironment();
    const algorand = AlgorandClient.fromConfig({ algodConfig });
    algorand.setDefaultSigner(transactionSigner);

    /**
     * Opt into the attendance app
     */
    const optIn = async (appId: number) => {
        if (!activeAddress) throw new Error('No active wallet');

        const result = await algorand.send.appCall({
            sender: activeAddress,
            appId: BigInt(appId),
            onComplete: algosdk.OnApplicationComplete.OptInOC,
        });

        return result.txIds[0];
    };

    /**
     * Mark attendance for a session
     */
    const markAttendance = async (appId: number, sessionId: string) => {
        if (!activeAddress) throw new Error('No active wallet');

        const appArgs = [
            new Uint8Array(Buffer.from('mark_attendance')),
            new Uint8Array(Buffer.from(sessionId)),
        ];

        const result = await algorand.send.appCall({
            sender: activeAddress,
            appId: BigInt(appId),
            args: appArgs,
        });

        return result.txIds[0];
    };

    /**
     * Create a new session (teacher)
     */
    const createSession = async (
        appId: number,
        sessionId: string,
        sessionName: string,
        durationSeconds: number
    ) => {
        if (!activeAddress) throw new Error('No active wallet');

        const appArgs = [
            new Uint8Array(Buffer.from('create_session')),
            new Uint8Array(Buffer.from(sessionId)),
            new Uint8Array(Buffer.from(sessionName)),
            algosdk.encodeUint64(durationSeconds),
        ];

        const result = await algorand.send.appCall({
            sender: activeAddress,
            appId: BigInt(appId),
            args: appArgs,
        });

        return result.txIds[0];
    };

    /**
     * Get student attendance record
     */
    const getAttendanceRecord = async (studentAddress: string, appId: number) => {
        try {
            const accountInfo = await algorand.client.algod
                .accountApplicationInformation(studentAddress, appId)
                .do();

            if (!accountInfo.appLocalState) {
                return null;
            }

            const localState = accountInfo.appLocalState.keyValue || [];
            const attendance: any = {};

            localState.forEach((item: any) => {
                const key = Buffer.from(item.key, 'base64').toString('utf-8');
                const value = item.value.type === 1
                    ? Buffer.from(item.value.bytes, 'base64').toString('utf-8')
                    : item.value.uint;
                attendance[key] = value;
            });

            return attendance;
        } catch (error) {
            console.error('Error fetching student attendance:', error);
            return null;
        }
    };

    /**
     * Get session information
     */
    const getSessionInfo = async (appId: number) => {
        try {
            const appInfo = await algorand.client.algod.getApplicationByID(appId).do();
            const globalState = appInfo.params.globalState || [];

            const session: any = {};

            globalState.forEach((item: any) => {
                const key = Buffer.from(item.key, 'base64').toString('utf-8');
                const value = item.value.type === 1
                    ? Buffer.from(item.value.bytes, 'base64').toString('utf-8')
                    : item.value.uint;
                session[key] = value;
            });

            return session;
        } catch (error) {
            console.error('Error fetching session info:', error);
            return null;
        }
    };

    /**
     * Add a teacher (admin only)
     */
    const addTeacher = async (appId: number, teacherAddress: string) => {
        if (!activeAddress) throw new Error('No active wallet');

        const appArgs = [
            new Uint8Array(Buffer.from('add_teacher')),
        ];

        const result = await algorand.send.appCall({
            sender: activeAddress,
            appId: BigInt(appId),
            args: appArgs,
            accountReferences: [teacherAddress],
        });

        return result.txIds[0];
    };

    /**
     * Remove a teacher (admin only)
     */
    const removeTeacher = async (appId: number, teacherAddress: string) => {
        if (!activeAddress) throw new Error('No active wallet');

        const appArgs = [
            new Uint8Array(Buffer.from('remove_teacher')),
        ];

        const result = await algorand.send.appCall({
            sender: activeAddress,
            appId: BigInt(appId),
            args: appArgs,
            accountReferences: [teacherAddress],
        });

        return result.txIds[0];
    };

    /**
     * Check if an address is an authorized teacher
     */
    const isTeacher = async (address: string, appId: number): Promise<boolean> => {
        try {
            const accountInfo = await algorand.client.algod
                .accountApplicationInformation(address, appId)
                .do();

            if (!accountInfo.appLocalState) {
                return false;
            }

            const localState = accountInfo.appLocalState.keyValue || [];
            
            for (const item of localState) {
                const key = Buffer.from(item.key, 'base64').toString('utf-8');
                if (key === 'is_teacher') {
                    return item.value.uint === 1;
                }
            }

            return false;
        } catch (error) {
            console.error('Error checking teacher status:', error);
            return false;
        }
    };

    return {
        optIn,
        markAttendance,
        createSession,
        getAttendanceRecord,
        getSessionInfo,
        addTeacher,
        removeTeacher,
        isTeacher,
    };
};

// Re-export algosdk for convenience
export { algosdk };
