import { TEACHER_ADDRESSES, QR_CODE_EXPIRY_SECONDS, QR_CODE_REFRESH_INTERVAL } from '../config/auth';

// Re-export for convenience
export { QR_CODE_REFRESH_INTERVAL };

/**
 * Check if a wallet address is authorized as a teacher
 */
export const isTeacher = (address: string | null): boolean => {
    if (!address) return false;
    return TEACHER_ADDRESSES.includes(address);
};

/**
 * Generate a timestamped QR code payload
 */
export interface QRCodePayload {
    sessionId: string;
    appId: number;
    timestamp: number;
    expiresAt: number;
}

export const generateQRPayload = (sessionId: string, appId: number): QRCodePayload => {
    const now = Math.floor(Date.now() / 1000);
    return {
        sessionId,
        appId,
        timestamp: now,
        expiresAt: now + QR_CODE_EXPIRY_SECONDS,
    };
};

/**
 * Validate a QR code payload
 */
export const validateQRPayload = (payload: QRCodePayload): { valid: boolean; reason?: string } => {
    const now = Math.floor(Date.now() / 1000);

    if (!payload.sessionId || !payload.appId || !payload.timestamp || !payload.expiresAt) {
        return { valid: false, reason: 'Invalid QR code format' };
    }

    if (now > payload.expiresAt) {
        return { valid: false, reason: 'QR code has expired' };
    }

    // Check if timestamp is in the future (clock skew protection)
    if (payload.timestamp > now + 60) {
        return { valid: false, reason: 'Invalid QR code timestamp' };
    }

    return { valid: true };
};

/**
 * Check if a QR code is still valid
 */
export const isQRCodeValid = (expiresAt: number): boolean => {
    const now = Math.floor(Date.now() / 1000);
    return now < expiresAt;
};

/**
 * Get remaining time for QR code in seconds
 */
export const getQRTimeRemaining = (expiresAt: number): number => {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, expiresAt - now);
};
