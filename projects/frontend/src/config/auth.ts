/**
 * Authentication Configuration
 * Teacher wallet addresses whitelist
 */

// Add your teacher wallet addresses here
export const TEACHER_ADDRESSES: string[] = [
    // Example addresses - replace with actual teacher wallet addresses
    'ZTQD36LLS2G4W6472YIDEBGARIWBK6MYTT25PTSFSMTBE5GSQIRPO53GHY',
    // Add more teacher addresses as needed
];

/**
 * QR Code Configuration
 */
export const QR_CODE_EXPIRY_SECONDS = 30; // QR codes expire after 30 seconds
export const QR_CODE_REFRESH_INTERVAL = 25000; // Refresh QR code every 25 seconds
