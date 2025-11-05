import React, { useMemo, useState, useRef } from 'react';
import { Vessel, VesselSchedule, VesselScheduleLifecycleStatus } from '../types';
import { Card } from '../components/ui/Card';
import { getCertificateStatus, getPerformanceStatus } from '../utils/helpers';
import { AlertTriangleIcon, ShipIcon, CalendarDaysIcon, BarChart3Icon, XIcon, CheckCircleIcon, ClockIcon, PencilIcon, GripVerticalIcon } from '../components/ui/icons';
import { Button } from '../components/ui/Button';

interface DashboardScreenProps {
    vessels: Vessel[];
    schedule: VesselSchedule[];
    dashboardOrder: string[];
    setDashboardOrder: (order: string[]) => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; description: string; children?: React.ReactNode; isEditMode?: boolean; }> = ({ title, value, icon, description, children, isEditMode }) => (
    <Card padding="md" className="flex flex-col h-full relative">
        {isEditMode && (
            <div className="absolute top-2 right-2 p-1 text-muted-foreground cursor-grab">
                <GripVerticalIcon className="h-5 w-5" />
            </div>
        )}
        <div className="flex items-center justify-between">
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

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ vessels, schedule, dashboardOrder, setDashboardOrder }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const dragItem = useRef<string | null>(null);
    const dragOverItem = useRef<string | null>(null);

    const certificateStats = useMemo(() => {
        const stats = { VÁLIDO: 0, 'VENCE EM BREVE': 0, VENCIDO: 0 };
        vessels.forEach(vessel => {
            const status = getCertificateStatus(vessel.expiryDate).text;
            if(status !== 'N/A') {
                stats[status]++;
            }
        });
        return stats;
    }, [vessels]);

    const scheduleStats = useMemo(() => {
        const stats: Record<VesselScheduleLifecycleStatus, number> = {
            PLANEJADO: 0,
            'EM CARREGAMENTO': 0,
            'EM TRÂNSITO': 0,
            'AGUARDANDO DESCARGA': 0,
            'EM DESCARGA': 0,
            CONCLUÍDO: 0,
        };
        schedule.forEach(item => {
            if (item.status in stats) {
                stats[item.status]++;
            }
        });
        return stats;
    }, [schedule]);

    const allCards: Record<string, React.ReactNode> = {
        certificates: (
            <KpiCard
                title="Certificados de Arqueação"
                value={vessels.length}
                icon={<ShipIcon className="h-6 w-6 text-muted-foreground" />}
                description="Total de embarcações cadastradas"
            >
                <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-green-500"/> Válidos</span> <span className="font-bold">{certificateStats['VÁLIDO']}</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><AlertTriangleIcon className="h-4 w-4 text-yellow-500"/> Vencem em breve</span> <span className="font-bold">{certificateStats['VENCE EM BREVE']}</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><XIcon className="h-4 w-4 text-red-500"/> Vencidos</span> <span className="font-bold">{certificateStats.VENCIDO}</span></li>
                </ul>
            </KpiCard>
        ),
        schedule: (
            <KpiCard
                title="Programação de Embarcações"
                value={schedule.length}
                icon={<CalendarDaysIcon className="h-6 w-6 text-muted-foreground" />}
                description="Status do ciclo de vida das operações"
            >
                 <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center"><span>Planejado</span><span className="font-bold">{scheduleStats.PLANEJADO}</span></li>
                    <li className="flex justify-between items-center"><span>Em Carregamento</span> <span className="font-bold">{scheduleStats['EM CARREGAMENTO']}</span></li>
                    <li className="flex justify-between items-center"><span>Em Trânsito</span> <span className="font-bold">{scheduleStats['EM TRÂNSITO']}</span></li>
                    <li className="flex justify-between items-center"><span>Aguard. Descarga</span> <span className="font-bold">{scheduleStats['AGUARDANDO DESCARGA']}</span></li>
                    <li className="flex justify-between items-center"><span>Em Descarga</span> <span className="font-bold">{scheduleStats['EM DESCARGA']}</span></li>
                    <li className="flex justify-between items-center"><span>Concluído</span> <span className="font-bold">{scheduleStats.CONCLUÍDO}</span></li>
                </ul>
            </KpiCard>
        ),
        loss: (
            <KpiCard
                title="Perdas Acumuladas"
                value="N/D"
                icon={<BarChart3Icon className="h-6 w-6 text-muted-foreground" />}
                description="Volume total perdido no mês"
            >
                <p className="text-xs text-muted-foreground text-center flex-grow flex items-center justify-center">O modelo de dados atual não suporta o cálculo de perdas. Requer a associação entre operações de carga e descarga.</p>
            </KpiCard>
        ),
        transit: (
            <KpiCard
                title="Tempo de Trânsito"
                value="N/D"
                icon={<ClockIcon className="h-6 w-6 text-muted-foreground" />}
                description="Meta de tempo em trânsito"
            >
                 <p className="text-xs text-muted-foreground text-center flex-grow flex items-center justify-center">O modelo de dados atual não suporta o cálculo de tempo de trânsito. Requer dados de início e fim de viagem por operação.</p>
            </KpiCard>
        )
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        dragItem.current = id;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        dragOverItem.current = id;
    };
    
    const handleDrop = () => {
        if (dragItem.current && dragOverItem.current) {
            const newDashboardOrder = [...dashboardOrder];
            const dragItemIndex = newDashboardOrder.indexOf(dragItem.current);
            const dragOverItemIndex = newDashboardOrder.indexOf(dragOverItem.current);

            if (dragItemIndex === -1 || dragOverItemIndex === -1) return;

            const [reorderedItem] = newDashboardOrder.splice(dragItemIndex, 1);
            newDashboardOrder.splice(dragOverItemIndex, 0, reorderedItem);
            
            setDashboardOrder(newDashboardOrder);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Operacional</h1>
                    <p className="text-muted-foreground">Visão geral do status dos equipamentos e operações.</p>
                </div>
                <Button 
                    variant={isEditMode ? 'primary' : 'secondary'}
                    onClick={() => setIsEditMode(!isEditMode)} 
                    icon={<PencilIcon className="h-4 w-4"/>}
                >
                    {isEditMode ? 'Concluir Edição' : 'Personalizar'}
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardOrder.map(id => {
                    const cardElement = allCards[id];
                    if (!cardElement) return null;
                    
                    return (
                        <div
                            key={id}
                            draggable={isEditMode}
                            onDragStart={isEditMode ? (e) => handleDragStart(e, id) : undefined}
                            onDragEnter={isEditMode ? (e) => handleDragEnter(e, id) : undefined}
                            onDragEnd={isEditMode ? handleDrop : undefined}
                            onDragOver={isEditMode ? (e) => e.preventDefault() : undefined}
                            className={`transition-all h-full ${isEditMode ? 'cursor-move rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                        >
                            {/* FIX: Cast the element to a type that includes the isEditMode prop to satisfy TypeScript. */}
                            {React.cloneElement(cardElement as React.ReactElement<{ isEditMode?: boolean }>, { isEditMode })}
                        </div>
                    );
                })}
            </div>
        </main>
    );
};