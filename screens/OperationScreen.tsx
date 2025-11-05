
import React, { useState, useEffect } from 'react';
import { OperationDetails, Signatures, Tank, Vessel, OperationStatus, VesselSchedule } from '../types';
import { OperationDetailsForm } from '../components/operation/OperationDetailsForm';
import { MainActions } from '../components/actions/MainActions';
import { TankList } from '../components/tank/TankList';
import { SummaryBar } from '../components/summary/SummaryBar';
import { SignatureSection } from '../components/signatures/SignatureSection';
import { AIAnalyst } from '../components/ai/AIAnalyst';
import { OperationActions } from '../components/operation/OperationActions';
import { SidebarTabs } from '../components/sidebar/SidebarTabs';
import { BarChart3Icon, PenSquareIcon, Wand2Icon } from '../components/ui/icons';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { brToNumber, numberToBr } from '../utils/helpers';

interface OperationScreenProps {
    operationDetails: OperationDetails;
    setOperationDetails: (details: OperationDetails) => void;
    tanks: Tank[];
    vessels: Vessel[];
    signatures: Signatures;
    setSignatures: React.Dispatch<React.SetStateAction<Signatures>>;
    analysisResult: string;
    isAnalyzing: boolean;
    onAddTank: () => void;
    onUpdateTank: (id: number, updatedTank: Tank) => void;
    onDeleteTank: (id: number) => void;
    onDuplicateTank: (id: number) => void;
    onCalcAll: () => void;
    onAIAnalysis: (prompt: string) => void;
    onSave: () => void;
    onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onNew: () => void;
    onExport: () => void;
    onReport: () => void;
    onConclude: () => void;
    activeSchedule: VesselSchedule | null;
    onUpdateSchedule: (updatedSchedule: VesselSchedule) => void;
    activeOperationType: 'loading' | 'unloading' | null;
}

const statusConfig: { [key in OperationStatus]: { text: string; className: string } } = {
    pendente: { text: 'Pendente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
    em_andamento: { text: 'Em Andamento', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
    concluida: { text: 'Concluída', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
    cancelada: { text: 'Cancelada', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
};


const RealizadoCard: React.FC<{
    schedule: VesselSchedule;
    onUpdate: (field: keyof VesselSchedule, value: string) => void;
}> = ({ schedule, onUpdate }) => {
    const plannedVol = brToNumber(schedule.plannedVolume || '0');
    const loadedVol = brToNumber(schedule.loadedVolume || '0');
    
    return (
        <Card>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Dados Realizados (CARREGAMENTO)</h2>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="ATA (Chegada na área)" type="datetime-local" value={schedule.ata || ''} onChange={e => onUpdate('ata', e.target.value)}/>
                    <Input label="ATB (Atracação)" type="datetime-local" value={schedule.atb || ''} onChange={e => onUpdate('atb', e.target.value)}/>
                    <Input label="ATS (Início Operação)" type="datetime-local" value={schedule.ats || ''} onChange={e => onUpdate('ats', e.target.value)}/>
                    <Input label="ATC_FINISH (Término Operação)" type="datetime-local" value={schedule.atcFinish || ''} onChange={e => onUpdate('atcFinish', e.target.value)}/>
                    <Input label="ATD (Saída do berço)" type="datetime-local" value={schedule.atd || ''} onChange={e => onUpdate('atd', e.target.value)} containerClassName="md:col-span-2"/>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                    <h3 className="font-semibold mb-2">Resumo de Volumes</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">Volume Previsto (L)</p>
                            <p className="font-mono font-semibold">{numberToBr(plannedVol, 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Volume Carregado (L)</p>
                            <p className="font-mono font-semibold">{numberToBr(loadedVol, 0)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const DischargeSummaryCard: React.FC<{
    schedule: VesselSchedule;
    tanks: Tank[];
}> = ({ schedule, tanks }) => {
    const totalLoaded = brToNumber(schedule.loadedVolume || '0');
    const totalAlreadyDischarged = schedule.discharges?.reduce((sum, d) => sum + d.totalDischargedVolume, 0) || 0;
    const volumeOnboard = totalLoaded - totalAlreadyDischarged;
    const volumeThisDischarge = tanks.reduce((sum, t) => sum + brToNumber(t.dischargedVolume || '0'), 0);

    return (
        <Card>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Dados Realizados (DESCARGA)</h2>
             <div className="p-4 bg-secondary rounded-lg">
                <h3 className="font-semibold mb-2">Resumo da Descarga</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground">Volume a Bordo (L)</p>
                        <p className="font-mono font-semibold text-lg">{numberToBr(volumeOnboard, 0)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Volume nesta Descarga (L)</p>
                        <p className="font-mono font-semibold text-lg text-primary">{numberToBr(volumeThisDischarge, 0)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Volume Restante (L)</p>
                        <p className="font-mono font-semibold text-lg">{numberToBr(volumeOnboard - volumeThisDischarge, 0)}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};


export const OperationScreen: React.FC<OperationScreenProps> = (props) => {
    const { activeSchedule, onUpdateSchedule, tanks, activeOperationType } = props;
    const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);

    const handleScheduleChange = (field: keyof VesselSchedule, value: string) => {
        if (props.activeSchedule) {
            props.onUpdateSchedule({ ...props.activeSchedule, [field]: value });
        }
    };

    const handleConcludeClick = () => {
        if (props.tanks.length === 0 || props.tanks.every(t => t.results.status === 'PENDING' && !t.isEmpty)) {
             if (activeOperationType !== 'unloading') {
                alert("Não é possível concluir uma operação vazia ou sem tanques calculados.");
                return;
             }
        }
        setIsConcludeModalOpen(true);
    };

    const confirmConclusion = () => {
        props.onConclude();
        setIsConcludeModalOpen(false);
    };

    const sidebarTabs = [
        {
            title: 'Resumo',
            icon: <BarChart3Icon className="h-4 w-4" />,
            content: <SummaryBar tanks={props.tanks} />
        },
        {
            title: 'Assinaturas',
            icon: <PenSquareIcon className="h-4 w-4" />,
            content: <SignatureSection signatures={props.signatures} setSignatures={props.setSignatures} />
        },
        {
            title: 'Análise IA',
            icon: <Wand2Icon className="h-4 w-4" />,
            content: <AIAnalyst onAnalyze={props.onAIAnalysis} result={props.analysisResult} isLoading={props.isAnalyzing} />
        }
    ];
    
    const currentStatus = statusConfig[props.operationDetails.status] || statusConfig.pendente;

    const opTitle = activeOperationType === 'loading' 
        ? 'Operação de Carregamento' 
        : activeOperationType === 'unloading' 
            ? 'Operação de Descarga'
            : 'Operação Atual';

    return (
        <>
            <main className="max-w-8xl mx-auto p-4 md:p-8">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                    <div>
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-bold tracking-tight">{opTitle}</h1>
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${currentStatus.className}`}>
                                {currentStatus.text}
                            </span>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {props.activeSchedule 
                                ? `Executando programação para: ${props.activeSchedule.vesselName}`
                                : 'Gerencie os detalhes, tanques e assinaturas da operação.'
                            }
                        </p>
                    </div>
                    <OperationActions 
                        onSave={props.onSave} 
                        onLoad={props.onLoad} 
                        onNew={props.onNew} 
                        onConclude={handleConcludeClick} 
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coluna Principal */}
                    <div className="lg:col-span-2 space-y-6">
                        <OperationDetailsForm 
                            details={props.operationDetails} 
                            setDetails={props.setOperationDetails}
                            vessels={props.vessels}
                            isReadOnly={!!props.activeSchedule}
                        />
                         {props.activeSchedule && activeOperationType === 'loading' && (
                            <RealizadoCard 
                                schedule={props.activeSchedule}
                                onUpdate={handleScheduleChange}
                            />
                        )}
                         {props.activeSchedule && activeOperationType === 'unloading' && (
                            <DischargeSummaryCard 
                                schedule={props.activeSchedule}
                                tanks={tanks}
                            />
                        )}
                        <MainActions 
                            onAddTank={props.onAddTank} 
                            onCalcAll={props.onCalcAll} 
                            onExport={props.onExport} 
                            onReport={props.onReport}
                            isVesselOperation={!!props.operationDetails.vesselId}
                        />
                        <TankList 
                            tanks={props.tanks} 
                            operationDetails={props.operationDetails}
                            onUpdate={props.onUpdateTank} 
                            onDelete={props.onDeleteTank} 
                            onDuplicate={props.onDuplicateTank}
                            activeOperationType={activeOperationType}
                        />
                    </div>
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <SidebarTabs tabs={sidebarTabs} />
                    </div>
                </div>
            </main>
            <ConfirmationModal
                isOpen={isConcludeModalOpen}
                onClose={() => setIsConcludeModalOpen(false)}
                onConfirm={confirmConclusion}
                title="Concluir Operação"
                variant="default"
                confirmText="Sim, Concluir"
            >
                <p>Você está prestes a finalizar e arquivar a operação <strong className="text-foreground">{props.operationDetails.id}</strong>.</p>
                <p>Após a conclusão, uma nova operação será iniciada. Esta ação não pode ser desfeita.</p>
                <p>Deseja continuar?</p>
            </ConfirmationModal>
        </>
    );
};