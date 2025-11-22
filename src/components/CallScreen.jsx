import React from 'react';
import Lottie from 'lottie-react';
import waveAnimation from '../assets/wave-animation.json';

const CallScreen = ({ status, onHangup, isMuted, onToggleMute }) => {
    if (status === 'idle') return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-main)',
            fontFamily: 'var(--font-primary)'
        }}>
            {/* Status Text */}
            <div style={{
                marginBottom: '2rem',
                fontSize: '1.5rem',
                fontWeight: '500',
                color: '#fff'
            }}>
                {status === 'connecting' && 'Connecting to Momo...'}
                {status === 'connected' && 'Connected to Momo'}
                {status === 'error' && 'Connection Error'}
            </div>

            {/* AI Avatar/Indicator with Lottie Animation */}
            {status === 'connected' && (
                <div style={{
                    width: '200px',
                    height: '200px',
                    marginBottom: '3rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Lottie
                        animationData={waveAnimation}
                        loop={true}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            )}

            {/* Control Buttons */}
            <div style={{
                display: 'flex',
                gap: 'var(--spacing-md)',
                alignItems: 'center'
            }}>
                {/* Mute Button */}
                {status === 'connected' && (
                    <button
                        onClick={onToggleMute}
                        style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            backgroundColor: isMuted ? '#e74c3c' : '#fff',
                            color: isMuted ? '#fff' : 'var(--color-text-main)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        {isMuted ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D3436" strokeWidth="2">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Hang Up Button */}
                <button
                    onClick={onHangup}
                    style={{
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--border-radius)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
                        transition: 'all 0.2s ease',
                        minWidth: '120px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(231, 76, 60, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.3)';
                    }}
                >
                    Hang Up
                </button>
            </div>

            {/* Helper Text */}
            {status === 'connected' && (
                <p style={{
                    marginTop: 'var(--spacing-lg)',
                    color: '#bbb',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                }}>
                    Speak naturally • Momo will ask for details about your situation
                </p>
            )}

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(45, 52, 54, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 30px rgba(45, 52, 54, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(45, 52, 54, 0); }
                }
            `}</style>
        </div>
    );
};

export default CallScreen;
