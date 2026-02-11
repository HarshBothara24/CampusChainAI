import React from 'react';
import { Link } from 'react-router-dom';
import { WalletButton } from '../components/attendance/WalletButton';
import { Shield, Brain, Award, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-8 h-8 text-emerald-600" />
                            <h1 className="text-2xl font-bold text-slate-900">CampusChain AI</h1>
                        </div>
                        <WalletButton />
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-20 text-center">
                    <h2 className="text-5xl font-bold text-slate-900 mb-6">
                        Decentralized Attendance with
                        <br />
                        <span className="text-emerald-600">AI Verification</span>
                    </h2>
                    <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                        Secure, transparent, and fraud-proof attendance tracking powered by Algorand blockchain
                        and artificial intelligence.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link
                            to="/teacher"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
                        >
                            Teacher Dashboard
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/student"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition-colors"
                        >
                            Mark Attendance
                        </Link>
                    </div>
                </div>

                {/* Features */}
                <div className="py-16 grid md:grid-cols-3 gap-8">
                    {/* Feature 1 */}
                    <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
                        <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
                            <Shield className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">On-Chain Attendance</h3>
                        <p className="text-slate-600">
                            Immutable attendance records stored on Algorand blockchain. Tamper-proof and
                            verifiable by anyone.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
                        <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
                            <Brain className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">AI Proxy Detection</h3>
                        <p className="text-slate-600">
                            Machine learning algorithms detect suspicious patterns and prevent proxy attendance
                            fraud.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
                        <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
                            <Award className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">NFT Certificates</h3>
                        <p className="text-slate-600">
                            Automatic NFT certificate minting for verified attendance. Portable digital proof of
                            participation.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <p className="text-center text-slate-500 text-sm">
                        Built with Algorand • Powered by AI • Secured by Blockchain
                    </p>
                </div>
            </footer>
        </div>
    );
};
