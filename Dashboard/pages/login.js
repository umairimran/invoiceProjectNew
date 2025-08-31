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
  
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { from } = router.query;
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
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
        <title>Login | MedPush X</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h1 className="font-signika font-bold text-2xl text-primary">MedPush X</h1>
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
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              
              <div className="relative">
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm pr-10"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <i className="fas fa-eye-slash"></i>
                  ) : (
                    <i className="fas fa-eye"></i>
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <i className="fas fa-spinner fa-spin"></i>
                    </span>
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
