

import React, { useMemo, useRef, useState } from 'react';
import { Vessel, VesselSchedule, VesselScheduleLifecycleStatus } from '../types';
import { Card } from '../components/ui/Card';
import { getCertificateStatus, getPerformanceStatus } from '../utils/helpers';
import { AlertTriangleIcon, ShipIcon, CalendarDaysIcon, BarChart3Icon, XIcon, CheckCircleIcon, ClockIcon } from '../components/ui/icons';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description: string;
    children?: React.ReactNode;
    isGrabbing?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, description, children, isGrabbing }) => (
    <Card padding="md" className="flex flex-col h-full">
        <div className={`flex items-center justify-between ${isGrabbing ? 'cursor-grabbing' : 'cursor-grab'}`}>
            <h3 className="text-md font-semibold text-muted-foreground">{title}</h3>
            {icon}
        </div>
        <div className="mt-2">
            <p className="text-4xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {children && <div className="mt-4 pt-4 border-t border-border flex-grow">{children}</div>}
    </Card>
);

export const DashboardScreen: React.FC<{
    vessels: Vessel[];
    schedule: VesselSchedule[];
}> = ({ vessels, schedule }) => {
    
    const certificateStats = useMemo(() => {
        const stats = { 'VÁLIDO': 0, 'VENCE EM BREVE': 0, 'VENCIDO': 0, 'N/A': 0 };
        vessels.forEach(vessel => {
            const status = getCertificateStatus(vessel.expiryDate).text;
            stats[status]++;
        });
        return stats;
    }, [vessels]);

    const scheduleStats = useMemo(() => {
        // FIX: Added 'AGUARDANDO CARREGAMENTO' to the stats object to match the VesselScheduleLifecycleStatus type.
        const stats: Record<VesselScheduleLifecycleStatus, number> = {
            'PLANEJADO': 0,
            'AGUARDANDO CARREGAMENTO': 0,
            'EM CARREGAMENTO': 0,
            'EM TRÂNSITO': 0,
            'AGUARDANDO DESCARGA': 0,
            'EM DESCARGA': 0,
            'CONCLUÍDO': 0,
        };
        schedule.forEach(item => {
            if (item.status in stats) {
                stats[item.status]++;
            }
        });
        return stats;
    }, [schedule]);

    const cardComponents = useMemo(() => ({
        certificates: {
            title: "Certificados de Arqueação",
            value: vessels.length,
            icon: <ShipIcon className="h-6 w-6 text-muted-foreground" />,
            description: "Total de embarcações cadastradas",
            children: (
                <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-green-500"/> Válidos</span> <span className="font-bold">{certificateStats['VÁLIDO']}</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><AlertTriangleIcon className="h-4 w-4 text-yellow-500"/> Vencem em breve</span> <span className="font-bold">{certificateStats['VENCE EM BREVE']}</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><XIcon className="h-4 w-4 text-red-500"/> Vencidos</span> <span className="font-bold">{certificateStats.VENCIDO}</span></li>
                </ul>
            ),
        },
        planning: {
            title: "Central de Planejamento",
            value: schedule.length,
            icon: <CalendarDaysIcon className="h-6 w-6 text-muted-foreground" />,
            description: "Status do ciclo de vida das operações",
            children: (
                <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center"><span>Planejado</span><span className="font-bold">{scheduleStats.PLANEJADO}</span></li>
                    <li className="flex justify-between items-center"><span>Em Carregamento</span> <span className="font-bold">{scheduleStats['EM CARREGAMENTO']}</span></li>
                    <li className="flex justify-between items-center"><span>Em Trânsito</span> <span className="font-bold">{scheduleStats['EM TRÂNSITO']}</span></li>
                    <li className="flex justify-between items-center"><span>Aguard. Descarga</span> <span className="font-bold">{scheduleStats['AGUARDANDO DESCARGA']}</span></li>
                    <li className="flex justify-between items-center"><span>Em Descarga</span> <span className="font-bold">{scheduleStats['EM DESCARGA']}</span></li>
                    <li className="flex justify-between items-center"><span>Concluído</span> <span className="font-bold">{scheduleStats.CONCLUÍDO}</span></li>
                </ul>
            ),
        },
        losses: {
            title: "Perdas Acumuladas",
            value: "N/D",
            icon: <BarChart3Icon className="h-6 w-6 text-muted-foreground" />,
            description: "Volume total perdido no mês",
            children: <p className="text-xs text-muted-foreground text-center flex-grow flex items-center justify-center">O modelo de dados atual não suporta o cálculo de perdas. Requer a associação entre operações de carga e descarga.</p>,
        },
        transit: {
            title: "Tempo de Trânsito",
            value: "N/D",
            icon: <ClockIcon className="h-6 w-6 text-muted-foreground" />,
            description: "Meta de tempo em trânsito",
            children: <p className="text-xs text-muted-foreground text-center flex-grow flex items-center justify-center">O modelo de dados atual não suporta o cálculo de tempo de trânsito. Requer dados de início e fim de viagem por operação.</p>,
        },
    }), [vessels, schedule, certificateStats, scheduleStats]);

    const initialCardOrder = useMemo(() => Object.keys(cardComponents), [cardComponents]);
    const [cardOrder, setCardOrder] = useLocalStorage('qc_dashboard_card_order', initialCardOrder);
    
    // Drag and Drop state
    const dragItem = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isGrabbing, setIsGrabbing] = useState(false);


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        setIsGrabbing(true);
        // This is to make the ghost image of the dragging item less opaque.
        if (e.target instanceof HTMLElement) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setDragImage(e.target, e.target.offsetWidth / 2, 40);
        }
    };

    const handleDragEnter = (index: number) => {
        setDragOverIndex(index);
    };
    
    const handleDragEnd = () => {
        dragItem.current = null;
        setDragOverIndex(null);
        setIsGrabbing(false);
    };

    const handleDrop = () => {
        if (dragOverIndex === null || dragItem.current === null || dragOverIndex === dragItem.current) {
            handleDragEnd();
            return;
        };

        const newCardOrder = [...cardOrder];
        const draggedItemContent = newCardOrder.splice(dragItem.current, 1)[0];
        newCardOrder.splice(dragOverIndex, 0, draggedItemContent);
        
        setCardOrder(newCardOrder);
        handleDragEnd();
    };

    // Ensure card order is initialized correctly if new cards are added/removed in code
    React.useEffect(() => {
        const currentKeys = new Set(cardOrder);
        const allKeys = new Set(Object.keys(cardComponents));
        if (currentKeys.size !== allKeys.size || !cardOrder.every(key => allKeys.has(key))) {
            setCardOrder(Object.keys(cardComponents));
        }
    }, [cardComponents, cardOrder, setCardOrder]);

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Central de Dashboard</h1>
                <p className="text-muted-foreground">Seu ponto central para visualização de dados e métricas operacionais. Arraste os cartões para reordenar.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {cardOrder.map((cardKey, index) => {
                    const cardData = cardComponents[cardKey as keyof typeof cardComponents];
                    if (!cardData) return null;

                    return (
                        <div
                            key={cardKey}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className={`transition-opacity duration-300 ${isGrabbing && dragItem.current === index ? 'opacity-40' : 'opacity-100'}`}
                        >
                            <KpiCard
                                title={cardData.title}
                                value={cardData.value}
                                icon={cardData.icon}
                                description={cardData.description}
                                isGrabbing={isGrabbing && dragItem.current === index}
                            >
                                {cardData.children}
                            </KpiCard>
                             {dragOverIndex === index && dragItem.current !== index && (
                                <div className="mt-6 border-2 border-dashed border-primary rounded-xl h-full absolute inset-0 -top-1" />
                            )}
                        </div>
                    );
                })}
            </div>
        </main>
    );
};
