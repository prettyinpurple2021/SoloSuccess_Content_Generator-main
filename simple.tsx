import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('🚀 Simple entry point running');

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <div style={{ color: 'white', padding: '20px', fontSize: '24px' }}>
    <h1>Hello World</h1>
    <p>React is working.</p>
  </div>
);
