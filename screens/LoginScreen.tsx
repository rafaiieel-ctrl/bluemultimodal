import React from 'react';
import { Button } from '../components/ui/Button';

interface LoginScreenProps {
    onEnter: () => void;
}

const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 3L3 20H21L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9.5 14L12 9L14.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8.5 16.5H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onEnter }) => {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4" style={{
            background: 'radial-gradient(ellipse at center, hsl(217, 91%, 60%), hsl(220, 90%, 30%))'
        }}>
            <div className="w-full max-w-sm animate-fade-in">
                <div 
                    className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 md:p-10 text-center text-white border border-white/20 shadow-2xl"
                >
                    <div className="flex justify-center mb-6">
                        <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                             <LogoIcon className="h-10 w-10 text-white" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-bold tracking-tight">
                        Blue Multimodal
                    </h1>
                    <p className="mt-2 text-white/80">
                        "Sua logística, no tom certo"
                    </p>

                    <div className="mt-10">
                        <Button 
                            size="lg" 
                            onClick={onEnter} 
                            className="w-full bg-white text-primary hover:bg-gray-200 shadow-lg hover:shadow-xl text-lg font-semibold py-3 transition-all duration-300 transform hover:-translate-y-0.5"
                        >
                            Enter Dashboard
                        </Button>
                    </div>

                    <p className="mt-8 text-xs text-white/50">
                        v1.0 • operations module
                    </p>
                </div>
            </div>
        </div>
    );
};