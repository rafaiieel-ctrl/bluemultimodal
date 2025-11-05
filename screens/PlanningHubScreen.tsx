import React from 'react';
import { Card } from '../components/ui/Card';
import { PipelineIcon, TrainFrontIcon, AnchorIcon, ShipIcon, TruckIcon, PlaneIcon } from '../components/ui/icons';

interface PlanningHubScreenProps {
    onSelectModal: (modal: 'dutoviario' | 'ferroviario' | 'fluvial' | 'maritimo' | 'rodoviario' | 'aereo') => void;
}

const ModalCard: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    description: string; 
    onClick: () => void;
    disabled?: boolean;
}> = ({ icon, title, description, onClick, disabled = false }) => (
    <Card 
        padding="md" 
        className={`
            text-center flex flex-col items-center justify-center transition-all duration-300
            ${disabled 
                ? 'opacity-50 cursor-not-allowed bg-secondary/50' 
                : 'hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20 cursor-pointer'
            }
        `}
        onClick={!disabled ? onClick : undefined}
    >
        <div className={`
            w-16 h-16 rounded-full grid place-items-center mb-4 transition-colors
            ${disabled ? 'bg-muted' : 'bg-primary text-primary-foreground'}
        `}>
            {icon}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground mt-1">{description}</p>
    </Card>
);

export const PlanningHubScreen: React.FC<PlanningHubScreenProps> = ({ onSelectModal }) => {
    
    const modals = [
        { id: 'dutoviario', icon: <PipelineIcon className="w-8 h-8"/>, title: "Dutoviário", description: "Planejamento de Dutos", disabled: true },
        { id: 'ferroviario', icon: <TrainFrontIcon className="w-8 h-8"/>, title: "Ferroviário", description: "Planejamento de Trens", disabled: true },
        { id: 'fluvial', icon: <AnchorIcon className="w-8 h-8"/>, title: "Fluvial", description: "Planejamento de Balsas", disabled: false },
        { id: 'maritimo', icon: <ShipIcon className="w-8 h-8"/>, title: "Marítimo", description: "Planejamento de Navios", disabled: true },
        { id: 'rodoviario', icon: <TruckIcon className="w-8 h-8"/>, title: "Rodoviário", description: "Planejamento de Caminhões", disabled: true },
        { id: 'aereo', icon: <PlaneIcon className="w-8 h-8"/>, title: "Aéreo", description: "Planejamento Aéreo", disabled: true },
    ] as const;

    return (
        <main className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4 md:p-8">
            <div className="max-w-4xl mx-auto text-center">
                <div className="mb-12">
                     <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        Central de planejamento multimodal
                    </h1>
                    <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Selecione o modal que deseja programar. Cada um possui um fluxo de planejamento e operação específico.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modals.map(modal => (
                        <ModalCard 
                            key={modal.id}
                            icon={modal.icon}
                            title={modal.title}
                            description={modal.description}
                            disabled={modal.disabled}
                            onClick={() => onSelectModal(modal.id)}
                        />
                    ))}
                </div>
            </div>
        </main>
    );
};