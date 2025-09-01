import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Head from 'next/head';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fontAwesomeLoaded, setFontAwesomeLoaded] = useState(false);
  
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { from } = router.query;
  
  // Check if Font Awesome is loaded
  useEffect(() => {
    const checkFontAwesome = () => {
      // Simple check if Font Awesome is available
      const testElement = document.createElement('i');
      testElement.className = 'fas fa-eye';
      document.body.appendChild(testElement);
      
      setTimeout(() => {
        const computedStyle = window.getComputedStyle(testElement, '::before');
        const isLoaded = computedStyle.content !== 'none' && computedStyle.content !== '';
        document.body.removeChild(testElement);
        setFontAwesomeLoaded(isLoaded);
      }, 100);
    };

    // Check after component mounts
    const timer = setTimeout(checkFontAwesome, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    // Only redirect if we've confirmed authentication and finished loading
    if (isAuthenticated && !loading) {
      console.log('Login page: User is authenticated, redirecting to dashboard');
      router.push(from || '/');
    }
  }, [isAuthenticated, loading, router, from]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Redirect to the page they were trying to access or dashboard
        router.push(from || '/');
      } else {
        setErrorMsg(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      setErrorMsg('An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <Head>
        <title>Login | Medpush X MEDPUSH</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-xl border-t-4 border-secondary">
          <div className="text-center">
            <h1 className="font-signika font-bold text-2xl text-primary">Medpush X MEDPUSH</h1>
            <p className="mt-2 text-sm text-gray-600 font-helvetica">Sign in to your account</p>
          </div>
          
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded border border-red-200 text-sm">
              {errorMsg}
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md space-y-4">
              <div>
                <label htmlFor="email" className="block font-helvetica text-sm font-medium text-gray-700 mb-2">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-transparent focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block font-helvetica text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative" style={{ minHeight: '48px' }}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-transparent focus:z-10 sm:text-sm pr-12"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/50 rounded-md cursor-pointer p-1 min-w-[24px] min-h-[24px] flex items-center justify-center z-10"
                    style={{ pointerEvents: 'auto' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {fontAwesomeLoaded ? (
                      showPassword ? (
                        <i className="fas fa-eye-slash text-sm"></i>
                      ) : (
                        <i className="fas fa-eye text-sm"></i>
                      )
                    ) : (
                      <span className="text-xs font-medium">
                        {showPassword ? 'Hide' : 'Show'}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 text-sm font-medium rounded-lg text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors flex items-center justify-center ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
