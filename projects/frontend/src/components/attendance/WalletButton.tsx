import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';

export const WalletButton: React.FC = () => {
    const { activeAddress, wallets } = useWallet();
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [showWalletModal, setShowWalletModal] = React.useState(false);

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleWalletConnect = async (walletId: string) => {
        const wallet = wallets?.find((w) => w.id === walletId);
        if (wallet) {
            try {
                await wallet.connect();
                setShowWalletModal(false);
            } catch (error) {
                console.error('Failed to connect:', error);
            }
        }
    };

    const handleDisconnect = async () => {
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

    // Get available wallets
    const availableWallets = wallets?.filter((w) => w.id !== 'kmd') || [];

    if (!activeAddress) {
        return (
            <>
                <button
                    onClick={() => setShowWalletModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
                >
                    <Wallet className="w-4 h-4" />
                    Connect Wallet
                </button>

                {/* Wallet Selection Modal */}
                {showWalletModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-xl font-semibold text-slate-900">Connect Wallet</h2>
                                <p className="text-sm text-slate-600 mt-1">
                                    Choose your preferred Algorand wallet
                                </p>
                            </div>

                            <div className="p-4 space-y-2">
                                {availableWallets.map((wallet) => (
                                    <button
                                        key={wallet.id}
                                        onClick={() => handleWalletConnect(wallet.id)}
                                        className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors group"
                                    >
                                        {wallet.metadata?.icon && (
                                            <img
                                                src={wallet.metadata.icon}
                                                alt={wallet.metadata.name}
                                                className="w-10 h-10 rounded-lg"
                                            />
                                        )}
                                        <div className="flex-1 text-left">
                                            <p className="font-medium text-slate-900 group-hover:text-emerald-700">
                                                {wallet.metadata?.name || wallet.id}
                                            </p>
                                            {wallet.isActive && (
                                                <p className="text-xs text-emerald-600">Connected</p>
                                            )}
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 rotate-[-90deg]" />
                                    </button>
                                ))}
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-slate-50">
                                <button
                                    onClick={() => setShowWalletModal(false)}
                                    className="w-full px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Get connected wallet info
    const connectedWallet = wallets?.find((w) => w.isActive);

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition-colors"
            >
                {connectedWallet?.metadata?.icon && (
                    <img
                        src={connectedWallet.metadata.icon}
                        alt={connectedWallet.metadata.name}
                        className="w-5 h-5 rounded"
                    />
                )}
                <span className="font-mono text-sm">{formatAddress(activeAddress)}</span>
                <ChevronDown className="w-4 h-4" />
            </button>

            {showDropdown && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-lg z-20">
                        <div className="p-3 border-b border-slate-200">
                            <p className="text-xs text-slate-500">Connected with</p>
                            <p className="text-sm font-medium text-slate-900 mt-1">
                                {connectedWallet?.metadata?.name || 'Wallet'}
                            </p>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
