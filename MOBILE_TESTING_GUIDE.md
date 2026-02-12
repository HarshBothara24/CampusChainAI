# Mobile Testing Guide - Local Network

## Setup Instructions

### 1. Start the Development Server

```bash
cd projects/frontend
pnpm dev
```

The server will start and show you the network URLs.

### 2. Find Your Local IP Address

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.0.x.x)

**On Mac/Linux:**
```bash
ifconfig
```
Look for "inet" address (usually starts with 192.168.x.x or 10.0.x.x)

### 3. Access from Mobile Devices

Once the server is running, you'll see output like:

```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

**On your mobile devices:**
1. Connect to the SAME WiFi network as your computer
2. Open browser on mobile
3. Go to: `http://YOUR_IP_ADDRESS:5173/`
   - Example: `http://192.168.1.100:5173/`

### 4. Testing Scenario

**Device 1 (Teacher):**
1. Open: `http://192.168.1.100:5173/teacher`
2. Connect wallet (Pera/Defly/etc.)
3. Create a new session
4. Display QR code on screen

**Device 2 (Student):**
1. Open: `http://192.168.1.100:5173/student`
2. Connect wallet (different wallet than teacher)
3. Click "Scan QR Code"
4. Grant camera permission
5. Scan QR from Device 1's screen
6. Mark attendance

## Important Notes

### Camera Access
- **HTTPS Required:** Camera access requires HTTPS in production
- **Local Testing:** Most browsers allow camera on `localhost` and local IPs
- **If camera doesn't work:** Use "Enter Session ID Manually" option

### Wallet Connections
- Each device needs its own wallet
- Pera Wallet works best on mobile
- Make sure both wallets are on TestNet
- Both wallets need to be funded (use https://bank.testnet.algorand.network/)

### Network Requirements
- Both devices must be on the SAME WiFi network
- Firewall might block connections (temporarily disable if needed)
- Some corporate/school networks block local connections

## Troubleshooting

### Can't Access from Mobile
1. Check both devices are on same WiFi
2. Verify IP address is correct
3. Try disabling firewall temporarily
4. Make sure dev server is running

### Camera Not Working
1. Grant camera permissions in browser
2. Use HTTPS (deploy to Vercel for testing)
3. Fallback: Use manual Session ID entry

### Wallet Connection Issues
1. Ensure wallet is on TestNet (not MainNet)
2. Check wallet has funds
3. Try different wallet (Pera, Defly, Exodus)
4. Clear browser cache and reconnect

### QR Scanning Issues
1. Ensure good lighting
2. Hold steady for 2-3 seconds
3. QR code expires after 30 seconds (auto-refreshes)
4. Fallback: Copy session ID manually

## Alternative: Deploy to Vercel

For easier mobile testing with HTTPS:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd projects/frontend
vercel
```

This gives you a public HTTPS URL that works on any device with full camera support.

## Testing Checklist

- [ ] Both devices on same WiFi
- [ ] Dev server running
- [ ] Can access from mobile browser
- [ ] Teacher wallet connected
- [ ] Student wallet connected (different from teacher)
- [ ] Both wallets funded on TestNet
- [ ] Session created successfully
- [ ] QR code displayed
- [ ] Camera permission granted
- [ ] QR scan successful
- [ ] Attendance marked successfully
- [ ] Transaction confirmed on blockchain

## Quick Test Commands

```bash
# Start dev server
cd projects/frontend
pnpm dev

# In another terminal, check your IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Access from mobile
http://YOUR_IP:5173/
```

## Security Note

This setup is for LOCAL TESTING ONLY. For production:
- Deploy to Vercel/Netlify with HTTPS
- Use environment variables for sensitive data
- Enable proper CORS settings
- Use production-ready wallet configurations
