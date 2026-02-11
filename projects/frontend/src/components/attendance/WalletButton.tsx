import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';

export const WalletButton: React.FC = () => {
    const { activeAddress, wallets } = useWallet();
    const [showDropdown, setShowDropdown] = React.useState(false);

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleConnect = async () => {
        // Get Pera wallet
        const peraWallet = wallets?.find((w) => w.id === 'pera');
        if (peraWallet) {
            try {
                await peraWallet.connect();
            } catch (error) {
                console.error('Failed to connect:', error);
            }
        }
    };

    const handleDisconnect = async () => {
        // Disconnect all wallets
        const connectedWallet = wallets?.find((w) => w.isActive);
        if (connectedWallet) {
            try {
                await connectedWallet.disconnect();
                setShowDropdown(false);
            } catch (error) {
                console.error('Failed to disconnect:', error);
            }
        }
    };

    if (!activeAddress) {
        return (
            <button
                onClick={handleConnect}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
            >
                <Wallet className="w-4 h-4" />
                Connect Wallet
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition-colors"
            >
                <Wallet className="w-4 h-4" />
                <span className="font-mono text-sm">{formatAddress(activeAddress)}</span>
                <ChevronDown className="w-4 h-4" />
            </button>

            {showDropdown && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-20">
                        <button
                            onClick={handleDisconnect}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Disconnect
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
