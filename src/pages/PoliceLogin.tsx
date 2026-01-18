import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function PoliceLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [showLegacyLogin, setShowLegacyLogin] = useState(false);
    const navigate = useNavigate();
    const { login, loginWithGoogle, isAuthenticated, loading } = useAuth();

    // Redirect if already authenticated
    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate('/police', { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        setError('');
        try {
            await loginWithGoogle();
        } catch (err) {
            setError('Failed to initiate Google Sign-In. Please try again or use email login.');
            setIsGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate a brief loading state for better UX
        setTimeout(() => {
            const success = login(email, password);

            if (success) {
                navigate('/police');
            } else {
                setError('Invalid credentials. Please check your email and password.');
                setIsLoading(false);
            }
        }, 800);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[hsl(350,100%,55%)] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Ambient glow effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(190,100%,50%)] opacity-[0.03] blur-[150px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(350,100%,50%)] opacity-[0.03] blur-[120px]" />
            </div>

            {/* Eye watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02]">
                <Eye className="w-[500px] h-[500px]" />
            </div>

            {/* Login card */}
            <div className="relative w-full max-w-md animate-fade-in">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(190,100%,50%)] to-[hsl(350,100%,55%)] rounded-2xl blur-2xl opacity-10" />

                <div className="relative bg-[hsl(240,15%,6%)] backdrop-blur-xl border border-[hsl(220,15%,15%)] rounded-2xl shadow-[0_20px_60px_-15px_hsl(240,15%,0%)] p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(350,100%,50%)] to-[hsl(350,100%,40%)] mb-4 shadow-[0_0_30px_-5px_hsl(350,100%,50%)]">
                            <Eye className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Law Enforcement Access</h1>
                        <p className="text-[hsl(220,15%,45%)] text-sm">Authorized Personnel Only</p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-[hsl(350,100%,50%)]/10 border border-[hsl(350,100%,50%)]/30 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="w-5 h-5 text-[hsl(350,100%,60%)] flex-shrink-0 mt-0.5" />
                            <p className="text-[hsl(350,100%,80%)] text-sm">{error}</p>
                        </div>
                    )}

                    {/* Google Sign-In Button */}
                    <Button
                        onClick={handleGoogleLogin}
                        disabled={isGoogleLoading}
                        className="w-full h-12 mb-4 bg-white hover:bg-gray-100 text-gray-800 font-medium border border-gray-200 shadow-sm transition-all duration-300"
                    >
                        {isGoogleLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Connecting...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span>Sign in with Google</span>
                            </div>
                        )}
                    </Button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[hsl(220,15%,15%)]"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <button
                                onClick={() => setShowLegacyLogin(!showLegacyLogin)}
                                className="bg-[hsl(240,15%,6%)] px-3 text-[hsl(220,15%,40%)] hover:text-[hsl(220,15%,60%)] transition-colors"
                            >
                                {showLegacyLogin ? 'Hide email login' : 'Or use email login'}
                            </button>
                        </div>
                    </div>

                    {/* Legacy Login form */}
                    {showLegacyLogin && (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[hsl(220,15%,70%)] font-medium">
                                    Email Address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(220,15%,40%)]" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="officer@police.gov"
                                        required
                                        className="pl-10 bg-[hsl(240,15%,8%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,15%,35%)] focus:border-[hsl(350,100%,50%)] focus:ring-1 focus:ring-[hsl(350,100%,50%)]/20 h-12 transition-all duration-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-[hsl(220,15%,70%)] font-medium">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(220,15%,40%)]" />
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        className="pl-10 bg-[hsl(240,15%,8%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,15%,35%)] focus:border-[hsl(350,100%,50%)] focus:ring-1 focus:ring-[hsl(350,100%,50%)]/20 h-12 transition-all duration-200"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 bg-gradient-to-r from-[hsl(350,100%,45%)] to-[hsl(350,100%,40%)] hover:from-[hsl(350,100%,50%)] hover:to-[hsl(350,100%,45%)] text-white font-bold shadow-[0_0_30px_-5px_hsl(350,100%,50%)] hover:shadow-[0_0_40px_-5px_hsl(350,100%,55%)] transition-all duration-300"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Authenticating...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-5 h-5" />
                                        <span>Access Dashboard</span>
                                    </div>
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-[hsl(220,15%,12%)]">
                        <p className="text-center text-xs text-[hsl(220,15%,40%)]">
                            This system is for authorized law enforcement use only.
                            <br />
                            Unauthorized access is prohibited and will be prosecuted.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
