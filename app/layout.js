import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PrivacyBanner from '@/components/PrivacyBanner';
import '@/styles/App.css';

export default function RootLayout({ children }) {
    return (
      <html lang="en">
        <head>
          <title>Wizard</title>
        </head>
        <body>
          <Header />
          <PrivacyBanner />
          <div>
            {children}
          </div>
          <Footer />
        </body>
      </html>
    )
  }
