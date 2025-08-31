import React from 'react';
import Head from 'next/head';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children, title = 'Medpush DMCC Dashboard' }) => {
  const { user, logout } = useAuth();

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Medpush DMCC Dashboard" />
        <link rel="icon" href="/favicon.ico" />
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" 
          integrity="sha512-Fo3rlrZj/k7ujTnHg4CGR2D7kSs0v4LLanw2qksYuRlEzO+tcaEPQogQ0KaoGN26/zrn20ImR1DfuLWnOo7aBA==" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer" 
        />
      </Head>

      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-3">
              <div>
                <h1 className="font-signika font-bold text-xl">Medpush X MEDPUSH</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-secondary text-white flex items-center justify-center">
                    <span className="font-helveticaBold">{user?.username ? user.username.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-helvetica text-gray-900">{user?.username || 'User'}</p>
                    <p className="text-xs text-gray-500 font-helvetica">{user?.role || 'Loading...'}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="btn btn-sm btn-secondary py-1 px-3 font-helvetica font-medium transition-colors duration-200 flex items-center space-x-2"
                  title="Logout"
                >
                  <i className="fas fa-sign-out-alt mr-1"></i>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;