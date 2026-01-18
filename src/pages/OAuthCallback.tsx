import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { handleOAuthCallback } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(true);

    useEffect(() => {
        const processCallback = async () => {
            const code = searchParams.get('code');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError('Authentication was cancelled or failed. Please try again.');
                setProcessing(false);
                return;
            }

            if (!code) {
                setError('No authorization code received. Please try again.');
                setProcessing(false);
                return;
            }

            try {
                const success = await handleOAuthCallback(code);
                if (success) {
                    navigate('/police', { replace: true });
                } else {
                    setError('Failed to complete authentication. Please try again.');
                    setProcessing(false);
                }
            } catch (err) {
                setError('An error occurred during authentication. Please try again.');
                setProcessing(false);
            }
        };

        processCallback();
    }, [searchParams, handleOAuthCallback, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Ambient glow effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(190,100%,50%)] opacity-[0.03] blur-[150px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(350,100%,50%)] opacity-[0.03] blur-[120px]" />
            </div>

            <div className="relative w-full max-w-md text-center">
                {/* Logo */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(350,100%,50%)] to-[hsl(350,100%,40%)] mb-6 shadow-[0_0_40px_-5px_hsl(350,100%,50%)]">
                    <Eye className="w-10 h-10 text-white" />
                </div>

                {processing ? (
                    <div className="space-y-4">
                        <Loader2 className="w-8 h-8 text-[hsl(350,100%,55%)] animate-spin mx-auto" />
                        <h2 className="text-xl font-bold text-white">Completing Sign In...</h2>
                        <p className="text-[hsl(220,15%,50%)]">Please wait while we verify your credentials.</p>
                    </div>
                ) : error ? (
                    <div className="space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(350,100%,50%)]/20 mb-2">
                            <AlertCircle className="w-8 h-8 text-[hsl(350,100%,60%)]" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Authentication Failed</h2>
                        <p className="text-[hsl(350,100%,70%)]">{error}</p>
                        <button
                            onClick={() => navigate('/police/login')}
                            className="mt-4 px-6 py-3 bg-[hsl(350,100%,45%)] hover:bg-[hsl(350,100%,50%)] text-white font-medium rounded-lg transition-colors"
                        >
                            Return to Login
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
