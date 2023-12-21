import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <body className='h-screen overflow-y-hidden'>
      <div className='h-full'>
        <App />
      </div>
    </body>
    
  </React.StrictMode>
);

