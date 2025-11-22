import React from 'react';

const CallScreen = ({ status, onHangup }) => {
    if (status === 'idle') return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'sans-serif'
        }}>
            <div style={{ marginBottom: '2rem', fontSize: '1.5rem' }}>
                {status === 'connecting' && 'Connecting to AI Agent...'}
                {status === 'connected' && 'AI Agent Connected'}
                {status === 'error' && 'Connection Error'}
            </div>

            {status === 'connected' && (
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: '#3498db',
                    marginBottom: '3rem',
                    animation: 'pulse 2s infinite'
                }}></div>
            )}

            <button
                onClick={onHangup}
                style={{
                    padding: '1rem 2rem',
                    fontSize: '1.2rem',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                Hang Up
            </button>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(52, 152, 219, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
                }
            `}</style>
        </div>
    );
};

export default CallScreen;
