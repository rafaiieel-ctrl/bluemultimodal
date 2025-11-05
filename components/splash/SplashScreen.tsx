
import React from 'react';
import { Button } from '../ui/Button';

interface SplashScreenProps {
    onStart: () => void;
}

const FeatureCard: React.FC<{ icon: string, title: string, description: string, tags: string[] }> = ({ icon, title, description, tags }) => (
    <div className="bg-card/70 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col hover:border-brand-500/50 transition-colors duration-300">
        <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-lg bg-brand-600 grid place-items-center text-2xl shadow-lg">{icon}</div>
            <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <p className="text-muted-foreground flex-grow">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
            {tags.map(tag => <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full">{tag}</span>)}
        </div>
    </div>
);

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
    return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center p-4" style={{
            backgroundImage: `radial-gradient(circle at 10% 20%, hsl(217 33% 17% / 0.8), transparent 50%),
                              radial-gradient(circle at 80% 90%, hsl(260 40% 20% / 0.5), transparent 50%)`
        }}>
            <div className="max-w-6xl mx-auto text-center">
                <div className="mb-12">
                     <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
                        QC Biofuels Pro
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        A solução definitiva para agilidade e precisão no controle de qualidade de biocombustíveis, agora com a potência da IA.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 text-left">
                    <FeatureCard icon="🧮" title="Cálculos NBR 5992" description="Cálculo instantâneo de FCV, ρ@20 e INPM com validação ANP." tags={['FCV', 'ANP']}/>
                    <FeatureCard icon="🖊️" title="Assinaturas Digitais" description="Colete assinaturas diretamente na tela para validar operações." tags={['Segurança', 'Compliance']}/>
                    <FeatureCard icon="📷" title="Leitor de QR Code" description="Adicione lacres de forma rápida e segura utilizando a câmera do seu dispositivo." tags={['Agilidade', 'QR Code']}/>
                    <FeatureCard icon="🤖" title="Análise com IA" description="Obtenha insights e resumos automáticos sobre seus dados de operação com a ajuda da IA." tags={['Gemini AI', 'Relatórios']}/>
                </div>
                <Button size="lg" onClick={onStart} className="px-12 py-7 text-lg shadow-blue-500/20 hover:shadow-blue-500/30">
                    Iniciar Nova Operação
                </Button>
            </div>
        </div>
    );
};
