import algosdk from 'algosdk';

// Your deployed contract details
export const ATTENDANCE_APP_ID = 755374037;

// Algorand SDK helper functions
export class AlgorandService {
    private algodClient: algosdk.Algodv2;

    constructor(algodClient: algosdk.Algodv2) {
        this.algodClient = algodClient;
    }

    /**
     * Student opts into the attendance application
     */
    async optInToApp(userAddress: string, appId: number): Promise<algosdk.Transaction> {
        const suggestedParams = await this.algodClient.getTransactionParams().do();

        const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
            sender: userAddress,
            suggestedParams: suggestedParams,
            appIndex: appId
        });

        return optInTxn;
    }

    /**
     * Mark attendance for a session
     */
    async markAttendance(
        userAddress: string,
        appId: number,
        sessionId: string
    ): Promise<algosdk.Transaction> {
        const suggestedParams = await this.algodClient.getTransactionParams().do();

        const appArgs = [
            new Uint8Array(Buffer.from('mark_attendance')),
            new Uint8Array(Buffer.from(sessionId)),
        ];

        const markAttendanceTxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: userAddress,
            suggestedParams: suggestedParams,
            appIndex: appId,
            appArgs: appArgs
        });

        return markAttendanceTxn;
    }

    /**
     * Create a new attendance session (teacher only)
     */
    async createSession(
        teacherAddress: string,
        appId: number,
        sessionId: string,
        sessionName: string,
        durationSeconds: number
    ): Promise<algosdk.Transaction> {
        const suggestedParams = await this.algodClient.getTransactionParams().do();

        const appArgs = [
            new Uint8Array(Buffer.from('create_session')),
            new Uint8Array(Buffer.from(sessionId)),
            new Uint8Array(Buffer.from(sessionName)),
            algosdk.encodeUint64(durationSeconds),
        ];

        const createSessionTxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: teacherAddress,
            suggestedParams: suggestedParams,
            appIndex: appId,
            appArgs: appArgs
        });

        return createSessionTxn;
    }

    /**
     * Close an attendance session (teacher only)
     */
    async closeSession(teacherAddress: string, appId: number): Promise<algosdk.Transaction> {
        const suggestedParams = await this.algodClient.getTransactionParams().do();

        const appArgs = [new Uint8Array(Buffer.from('close_session'))];

        const closeSessionTxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: teacherAddress,
            suggestedParams: suggestedParams,
            appIndex: appId,
            appArgs: appArgs
        });

        return closeSessionTxn;
    }

    /**
     * Get student's local state (attendance record)
     */
    async getStudentAttendance(studentAddress: string, appId: number) {
        try {
            const accountInfo = await this.algodClient
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
    }

    /**
     * Get global state (session info)
     */
    async getSessionInfo(appId: number) {
        try {
            const appInfo = await this.algodClient.getApplicationByID(appId).do();
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
    }

    /**
     * Wait for transaction confirmation
     */
    async waitForConfirmation(txId: string): Promise<any> {
        const response = await algosdk.waitForConfirmation(this.algodClient, txId, 4);
        return response;
    }
}
