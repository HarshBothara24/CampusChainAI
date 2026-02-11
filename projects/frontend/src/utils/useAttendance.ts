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
            const accountInfo: any = await algorand.client.algod
                .accountApplicationInformation(studentAddress, appId)
                .do();

            const appLocalState = accountInfo["app-local-state"];
            if (!appLocalState) {
                return null;
            }

            const localState = appLocalState["key-value"] || [];
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
            // First, check if this address is the creator
            const appInfo = await algorand.client.algod.getApplicationByID(appId).do();
            const creator = appInfo.params.creator;
            
            console.log('Checking teacher status for:', address);
            console.log('Contract creator:', creator);
            
            // If user is the creator, they're automatically a teacher
            if (address === String(creator)) {
                console.log('User is the creator - automatically authorized');
                return true;
            }

            // Otherwise, check local state
            const accountInfo: any = await algorand.client.algod
                .accountApplicationInformation(address, appId)
                .do();

            console.log('Full account info:', JSON.stringify(accountInfo, null, 2));

            const appLocalState = accountInfo["app-local-state"];
            if (!appLocalState) {
                console.log('No app-local-state found');
                return false;
            }

            console.log('App local state:', JSON.stringify(appLocalState, null, 2));

            const localState = appLocalState["key-value"] || [];
            console.log('Local state key-value:', JSON.stringify(localState, null, 2));
            
            for (const item of localState) {
                const key = Buffer.from(item.key, 'base64').toString('utf-8');
                console.log(`Key: ${key}, Value:`, item.value);
                if (key === 'is_teacher') {
                    const isTeacherValue = item.value.uint === 1;
                    console.log(`is_teacher value: ${isTeacherValue}`);
                    return isTeacherValue;
                }
            }

            console.log('is_teacher key not found in local state');
            return false;
        } catch (error) {
            console.error('Error checking teacher status:', error);
            return false;
        }
    };

    /**
     * Get the contract creator address
     */
    const getCreator = async (appId: number): Promise<string | null> => {
        try {
            const appInfo = await algorand.client.algod.getApplicationByID(appId).do();
            return String(appInfo.params.creator);
        } catch (error) {
            console.error('Error fetching creator:', error);
            return null;
        }
    };

    /**
     * Get all accounts that have opted into the app
     */
    const getOptedInAccounts = async (appId: number) => {
        try {
            // Use Algorand Indexer to get all accounts opted into this app
            const indexerUrl = 'https://testnet-idx.algonode.cloud';
            const response = await fetch(
                `${indexerUrl}/v2/accounts?application-id=${appId}&limit=100`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch opted-in accounts');
            }

            const data = await response.json();
            const accounts = data.accounts || [];

            // Process each account to get their local state
            const processedAccounts = await Promise.all(
                accounts.map(async (account: any) => {
                    const address = account.address;
                    const appLocalState = account['apps-local-state']?.find(
                        (app: any) => app.id === appId
                    );

                    if (!appLocalState) {
                        return null;
                    }

                    const keyValue = appLocalState['key-value'] || [];
                    const state: any = { address };

                    keyValue.forEach((item: any) => {
                        const key = Buffer.from(item.key, 'base64').toString('utf-8');
                        const value = item.value.type === 1
                            ? Buffer.from(item.value.bytes, 'base64').toString('utf-8')
                            : item.value.uint;
                        state[key] = value;
                    });

                    return state;
                })
            );

            return processedAccounts.filter(account => account !== null);
        } catch (error) {
            console.error('Error fetching opted-in accounts:', error);
            return [];
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
        getCreator,
        getOptedInAccounts,
    };
};

// Re-export algosdk for convenience
export { algosdk };
