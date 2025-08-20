import React from 'react';
import Head from 'next/head';
import Sidebar from './Sidebar';

const Layout = ({ children, title = 'Medpush DMCC Dashboard' }) => {
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
                <h1 className="font-signika font-bold text-xl">Medpush DMCC</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
                  />
                  <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <i className="fas fa-bell"></i>
                    <span className="absolute top-0 right-0 h-2 w-2 bg-secondary rounded-full"></span>
                  </button>
                  <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <i className="fas fa-envelope"></i>
                  </button>
                  <div className="h-8 w-8 rounded-full bg-secondary text-white flex items-center justify-center">
                    <span className="font-helveticaBold">A</span>
                  </div>
                </div>
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