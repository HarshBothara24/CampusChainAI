import { useWallet } from '@txnlab/use-wallet-react';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from './network/getAlgoClientConfigs';

/**
 * Custom hook for secure attendance contract interactions
 * Implements wallet-bound dynamic QR validation
 */
export const useSecureAttendance = () => {
    const { activeAddress, transactionSigner } = useWallet();

    const algodConfig = getAlgodConfigFromViteEnvironment();
    const algorand = AlgorandClient.fromConfig({ algodConfig });
    algorand.setDefaultSigner(transactionSigner);

    /**
     * Mark attendance with secure QR validation
     * @param appId - Application ID
     * @param sessionId - Session identifier
     * @param qrRound - Round number from QR code
     * @param qrHash - Hash from QR code (base64 encoded)
     */
    const markSecureAttendance = async (
        appId: number,
        sessionId: string,
        qrRound: number,
        qrHash: string
    ) => {
        if (!activeAddress) throw new Error('No active wallet');

        // Convert qrRound to 8-byte big-endian format (uint64)
        const roundBytes = new Uint8Array(8);
        const view = new DataView(roundBytes.buffer);
        view.setBigUint64(0, BigInt(qrRound), false);

        // Decode qrHash from base64
        const qrHashBytes = Buffer.from(qrHash, 'base64');

        const appArgs = [
            new Uint8Array(Buffer.from('mark_attendance')),
            new Uint8Array(Buffer.from(sessionId)),
            roundBytes,
            new Uint8Array(qrHashBytes),
        ];

        const result = await algorand.send.appCall({
            sender: activeAddress,
            appId: BigInt(appId),
            args: appArgs,
        });

        return result.txIds[0];
    };

    /**
     * Verify QR code locally before submitting transaction
     * This provides immediate feedback to the user
     */
    const verifyQRLocally = async (
        sessionId: string,
        qrRound: number,
        qrHash: string,
        studentAddress: string
    ): Promise<{ valid: boolean; reason?: string }> => {
        try {
            // Get current round
            const status = await algorand.client.algod.status().do();
            const currentRound = status['last-round'];

            // Check if QR is expired (older than 5 rounds)
            if (currentRound - qrRound > 5) {
                return {
                    valid: false,
                    reason: `QR code expired. Generated at round ${qrRound}, current round ${currentRound}`,
                };
            }

            // Recompute hash locally
            const roundBytes = new Uint8Array(8);
            const view = new DataView(roundBytes.buffer);
            view.setBigUint64(0, BigInt(qrRound), false);

            const studentAddressBytes = algosdk.decodeAddress(studentAddress).publicKey;
            const sessionIdBytes = new TextEncoder().encode(sessionId);

            const combined = new Uint8Array(
                sessionIdBytes.length + roundBytes.length + studentAddressBytes.length
            );
            combined.set(sessionIdBytes, 0);
            combined.set(roundBytes, sessionIdBytes.length);
            combined.set(studentAddressBytes, sessionIdBytes.length + roundBytes.length);

            const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
            const computedHash = Buffer.from(hashBuffer).toString('base64');

            // Compare hashes
            if (computedHash !== qrHash) {
                return {
                    valid: false,
                    reason: 'QR code is not valid for your wallet address',
                };
            }

            return { valid: true };
        } catch (error) {
            console.error('Error verifying QR:', error);
            return {
                valid: false,
                reason: 'Failed to verify QR code',
            };
        }
    };

    /**
     * Scan and process QR code
     * @param qrData - JSON string from QR code
     */
    const processQRCode = async (qrData: string) => {
        try {
            const payload = JSON.parse(qrData);
            const { sessionId, appId, qrRound, qrHash, studentAddress } = payload;

            // Verify this QR is for the current user
            if (studentAddress !== activeAddress) {
                throw new Error('This QR code is not for your wallet address');
            }

            // Verify QR locally first
            const verification = await verifyQRLocally(
                sessionId,
                qrRound,
                qrHash,
                activeAddress
            );

            if (!verification.valid) {
                throw new Error(verification.reason);
            }

            // Submit transaction
            const txId = await markSecureAttendance(appId, sessionId, qrRound, qrHash);

            return {
                success: true,
                txId,
                message: 'Attendance marked successfully',
            };
        } catch (error: any) {
            console.error('Error processing QR:', error);
            return {
                success: false,
                error: error.message || 'Failed to process QR code',
            };
        }
    };

    /**
     * Create a new session (teacher)
     * Now uses round-based expiry instead of timestamp
     */
    const createSecureSession = async (
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

    return {
        markSecureAttendance,
        verifyQRLocally,
        processQRCode,
        createSecureSession,
        optIn,
    };
};

export { algosdk };
