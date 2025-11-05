import React, { useMemo } from 'react';
import { VesselSchedule, VesselScheduleLifecycleStatus } from '../types';
import { Button } from '../components/ui/Button';
import { PlusCircleIcon, ShipIcon, CheckCircleIcon, FileTextIcon } from '../components/ui/icons';

interface OperationsHubScreenProps {
    schedule: VesselSchedule[];
    onStartOperation: (scheduleId: number) => void;
    onRegisterArrival: (scheduleId: number) => void;
    onStartDischarge: (scheduleId: number) => void;
    onViewOperation: (scheduleId: number) => void;
    onNewOperation: () => void;
    onFinalizeTrip: (scheduleId: number) => void;
    onGenerateReport: (scheduleId: number) => void;
}

const statusTags: Record<VesselScheduleLifecycleStatus, {text: string, className: string}> = {
    'PLANEJADO': {text: "Planejado", className: "bg-yellow-500/20 text-yellow-500"},
    'EM CARREGAMENTO': {text: "Carregando", className: "bg-blue-500/20 text-blue-500"},
    'EM TRÂNSITO': {text: "Em Trânsito", className: "bg-purple-500/20 text-purple-500"},
    'AGUARDANDO DESCARGA': {text: "Aguard. Descarga", className: "bg-teal-500/20 text-teal-500"},
    'EM DESCARGA': {text: "Descarregando", className: "bg-cyan-500/20 text-cyan-500"},
    'CONCLUÍDO': {text: "Concluído", className: "bg-green-500/20 text-green-500"},
}

const OperationCard: React.FC<{ 
    item: VesselSchedule; 
    onStartLoading?: (id: number) => void; 
    onRegisterArrival?: (id: number) => void;
    onStartDischarge?: (id: number) => void;
    onView?: (id: number) => void;
    onFinalizeTrip?: (id: number) => void;
    onGenerateReport?: (id: number) => void;
}> = ({ item, onStartLoading, onRegisterArrival, onStartDischarge, onView, onFinalizeTrip, onGenerateReport }) => {
    
    const isViewable = (item.status === 'EM CARREGAMENTO' || item.status === 'EM DESCARGA') && onView;
    const tag = statusTags[item.status] || statusTags['PLANEJADO'];
    
    const handleCardClick = () => {
        if (isViewable) {
            onView(item.id);
        }
    };

    const renderAction = () => {
        switch (item.status) {
            case 'PLANEJADO':
                return onStartLoading && <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onStartLoading(item.id); }}>Carregar</Button>;
            case 'EM TRÂNSITO':
                 return onRegisterArrival && <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onRegisterArrival(item.id); }}>Chegou</Button>;
            case 'AGUARDANDO DESCARGA':
                return onStartDischarge && <Button size="sm" onClick={(e) => { e.stopPropagation(); onStartDischarge(item.id); }}>Descarregar</Button>;
             case 'EM CARREGAMENTO':
             case 'EM DESCARGA':
                 return onView && <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onView(item.id); }}>Ver</Button>;
            case 'CONCLUÍDO':
                 return onGenerateReport && <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onGenerateReport(item.id); }}>Relatório</Button>;
            default:
                return null;
        }
    }

    return (
        <div 
            className={`p-4 bg-card rounded-lg border shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 group ${isViewable ? 'cursor-pointer' : ''}`}
            onClick={handleCardClick}
        >
            <div className="flex justify-between items-start gap-2">
                 <span className={`px-2 py-0.5 text-xs font-semibold rounded ${tag.className}`}>{tag.text}</span>
            </div>
            <div className="mt-2">
                <h4 className="font-bold text-foreground text-md">{item.vesselName}</h4>
                <p className="text-xs text-muted-foreground">{item.port} → {item.client}</p>
            </div>
             <div className="mt-4 pt-4 border-t border-border flex justify-end items-center gap-2">
                {renderAction()}
            </div>
        </div>
    );
};

const OperationsColumn: React.FC<{ title: string; items: VesselSchedule[]; children: (item: VesselSchedule) => React.ReactNode; }> = ({ title, items, children }) => (
    <div className="bg-secondary/50 rounded-xl p-3 flex-shrink-0 w-[340px] h-full flex flex-col">
        <h3 className="font-semibold mb-4 px-2 text-lg">{title} <span className="text-base font-normal text-muted-foreground">({items.length})</span></h3>
        <div className="space-y-3 flex-grow overflow-y-auto pr-1 -mr-1">
            {items.length > 0 ? (
                items.map(item => <React.Fragment key={item.id}>{children(item)}</React.Fragment>)
            ) : (
                <div className="text-center text-sm text-muted-foreground pt-8 h-full flex flex-col items-center justify-center">
                    <p>Nenhuma operação aqui.</p>
                </div>
            )}
        </div>
    </div>
);

export const OperationsHubScreen: React.FC<OperationsHubScreenProps> = ({ schedule, onStartOperation, onRegisterArrival, onStartDischarge, onViewOperation, onNewOperation, onFinalizeTrip, onGenerateReport }) => {
    
    const categorizedSchedules = useMemo(() => {
        const programadas = schedule.filter(s => s.status === 'PLANEJADO');
        const aguardandoCarregamento: VesselSchedule[] = []; // Placeholder column
        const emCarregamento = schedule.filter(s => s.status === 'EM CARREGAMENTO');
        const emTransito = schedule.filter(s => s.status === 'EM TRÂNSITO');
        const aguardandoDescarga = schedule.filter(s => s.status === 'AGUARDANDO DESCARGA');
        const emDescarga = schedule.filter(s => s.status === 'EM DESCARGA');
        const finalizadas = schedule.filter(s => s.status === 'CONCLUÍDO');
        return { programadas, aguardandoCarregamento, emCarregamento, emTransito, aguardandoDescarga, emDescarga, finalizadas };
    }, [schedule]);

    return (
        <main className="h-screen flex flex-col p-4 md:p-6 bg-secondary/30">
            <div className="flex-shrink-0 flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Central de Operações</h1>
                    <p className="text-muted-foreground">Acompanhe o status das embarcações em um só lugar.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => {}}>Filtrar</Button>
                    <Button onClick={onNewOperation} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                        Nova Operação
                    </Button>
                </div>
            </div>

            <div className="flex-grow flex gap-4 overflow-x-auto pb-2 -mx-4 md:-mx-6 px-4 md:px-6">
                <OperationsColumn title="Programadas" items={categorizedSchedules.programadas}>
                    {item => <OperationCard item={item} onStartLoading={onStartOperation} />}
                </OperationsColumn>
                <OperationsColumn title="Aguardando Carregamento" items={categorizedSchedules.aguardandoCarregamento}>
                    {item => <OperationCard item={item} />}
                </OperationsColumn>
                <OperationsColumn title="Em Carregamento" items={categorizedSchedules.emCarregamento}>
                    {item => <OperationCard item={item} onView={onViewOperation} onGenerateReport={onGenerateReport} />}
                </OperationsColumn>
                <OperationsColumn title="Em Trânsito" items={categorizedSchedules.emTransito}>
                    {item => <OperationCard item={item} onRegisterArrival={onRegisterArrival} onGenerateReport={onGenerateReport} />}
                </OperationsColumn>
                <OperationsColumn title="Aguardando Descarga" items={categorizedSchedules.aguardandoDescarga}>
                    {item => <OperationCard item={item} onStartDischarge={onStartDischarge} onFinalizeTrip={onFinalizeTrip} onGenerateReport={onGenerateReport} />}
                </OperationsColumn>
                <OperationsColumn title="Em Descarga" items={categorizedSchedules.emDescarga}>
                    {item => <OperationCard item={item} onView={onViewOperation} onGenerateReport={onGenerateReport} />}
                </OperationsColumn>
                <OperationsColumn title="Finalizadas" items={categorizedSchedules.finalizadas}>
                    {item => <OperationCard item={item} onGenerateReport={onGenerateReport} />}
                </OperationsColumn>
            </div>
        </main>
    );
};