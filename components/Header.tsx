import React from 'react'

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl font-bold text-primary mb-4">
        Value Stock Screener
      </h1>
      <p className="text-lg text-gray-600">
        Identify undervalued stocks based on Benjamin Graham&apos;s value investing principles
      </p>
    </header>
  )
}

export default Header 