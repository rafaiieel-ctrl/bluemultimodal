import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { VesselSchedule, VesselOpType, Vessel, VesselPerformanceStatus, ScheduledTankInOp, ProductType, VesselScheduleLifecycleStatus, Incoterm } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Trash2Icon, PlusCircleIcon, XIcon, ShipIcon, CheckCircleIcon, ListIcon, LayoutGridIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, AnchorIcon, PenSquareIcon, RotateCwIcon, GitForkIcon, Settings2Icon } from '../components/ui/icons';
import { nowLocal, getPerformanceStatus, brToNumber, numberToBr } from '../utils/helpers';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { LacreManager } from '../components/tank/LacreManager';
import { Textarea } from '../components/ui/Textarea';

// Dummy data updated to match the image provided and include more details for new columns.
const createDummySchedules = (): VesselSchedule[] => [
    {
        id: 4,
        status: 'PLANEJADO',
        product: 'anidro',
        vesselType: 'Navio',
        vesselName: 'MT Atlântico',
        port: 'Porto de Santos-SP',
        client: 'Petrobras',
        eta: '2024-08-20T18:00',
        etb: '2024-08-20T22:00',
        etd: '2024-08-21T10:00',
        plannedVolume: '1500000',
        orders: ['PED-00401'],
        tanks: [],
    },
    {
        id: 3,
        status: 'EM CARREGAMENTO',
        product: 'anidro',
        vesselType: 'Balsa',
        vesselName: 'Balsa Rio Solimões',
        port: 'Miritituba-PA',
        client: 'Vibra Energia',
        eta: '2024-08-15T08:00',
        etb: '2024-08-15T09:00',
        atb: '2024-08-15T11:30', // To make it 'Atrasado'
        etd: '2024-08-16T18:00',
        plannedVolume: '850000',
        loadedVolume: '851234',
        orders: ['PED-00301'],
        tanks: [],
    },
    {
        id: 2,
        status: 'EM TRÂNSITO',
        product: 'hidratado',
        vesselType: 'Navio',
        vesselName: 'Navio XYZ',
        port: 'Suape-PE',
        client: 'Raízen',
        eta: '2024-08-12T07:00',
        etb: '2024-08-12T08:00',
        atb: '2024-08-12T07:15', // 'No Prazo'
        etd: '2024-08-13T12:00',
        atd: '2024-08-13T11:30',
        plannedVolume: '2200000',
        loadedVolume: '2198750',
        orders: ['PED-00255'],
        tanks: [],
    },
    {
        id: 1,
        status: 'CONCLUÍDO',
        product: 'anidro',
        vesselType: 'Balsa',
        vesselName: 'Balsa Tia Terezinha',
        port: 'Manaus-AM',
        client: 'Ipiranga Manaus',
        eta: '2024-08-10T13:00',
        etb: '2024-08-10T14:00',
        atb: '2024-08-10T14:35', // 'Atrasado'
        etd: '2024-08-11T18:00',
        atd: '2024-08-11T19:00',
        plannedVolume: '950000',
        loadedVolume: '949800',
        orders: ['PED-00123', 'PED-00124'],
        tanks: [],
    },
];

// --- SUB-COMPONENTS (Defined in the same file as per constraints) ---

const LifecycleStatusBadge: React.FC<{ status: VesselScheduleLifecycleStatus }> = ({ status }) => {
    const statusConfig: Record<VesselScheduleLifecycleStatus, { text: string, style: string, icon: React.ReactNode }> = {
        PLANEJADO: { text: 'Planejado', style: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-500', icon: <PenSquareIcon className="h-3 w-3" /> },
        'EM CARREGAMENTO': { text: 'Carregando', style: 'border-blue-400/50 bg-blue-400/10 text-blue-500', icon: <RotateCwIcon className="h-3 w-3" /> },
        'EM TRÂNSITO': { text: 'Em Trânsito', style: 'border-purple-400/50 bg-purple-400/10 text-purple-500', icon: <ShipIcon className="h-3 w-3" /> },
        'AGUARDANDO DESCARGA': { text: 'Aguard. Descarga', style: 'border-teal-400/50 bg-teal-400/10 text-teal-500', icon: <AnchorIcon className="h-3 w-3" /> },
        'EM DESCARGA': { text: 'Descarregando', style: 'border-cyan-400/50 bg-cyan-400/10 text-cyan-500', icon: <ArrowDownCircleIcon className="h-3 w-3" /> },
        CONCLUÍDO: { text: 'Concluído', style: 'border-green-400/50 bg-green-400/10 text-green-500', icon: <CheckCircleIcon className="h-3 w-3" /> },
    };
    const { text, style, icon } = statusConfig[status] || statusConfig.PLANEJADO;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${style}`}>
            {icon}
            {text}
        </span>
    );
};


const PerformanceStatusBadge: React.FC<{ status: VesselPerformanceStatus | null }> = ({ status }) => {
    if (!status) return null;
    const dotStyles: Record<VesselPerformanceStatus, string> = {
        'NO PRAZO': 'bg-green-500',
        ATRASADO: 'bg-red-500',
        ADIANTADO: 'bg-blue-500',
    };
    
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${dotStyles[status]}`}></span>
            {status === 'NO PRAZO' ? 'No Prazo' : status}
        </span>
    );
};

const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Data Inválida';
    }
};

const COLUMN_CONFIG: Record<string, { label: string; default: boolean; className: string }> = {
    embarcacao: { label: 'Embarcação / Cliente', default: true, className: 'flex-1 pr-4 min-w-[250px]' },
    porto: { label: 'Porto', default: true, className: 'w-1/6 flex-shrink-0 pr-4 min-w-[150px]' },
    etb: { label: 'ETB', default: true, className: 'w-[140px] flex-shrink-0 pr-4' },
    status: { label: 'Status', default: true, className: 'w-[180px] flex-shrink-0 pr-4' },
    eta: { label: 'ETA', default: false, className: 'w-[140px] flex-shrink-0 pr-4' },
    etd: { label: 'ETD', default: false, className: 'w-[140px] flex-shrink-0 pr-4' },
    volumePlanejado: { label: 'Vol. Planejado (L)', default: false, className: 'w-[150px] flex-shrink-0 pr-4 text-right' },
    volumeCarregado: { label: 'Vol. Carregado (L)', default: false, className: 'w-[150px] flex-shrink-0 pr-4 text-right' },
    pedidos: { label: 'Pedidos', default: false, className: 'w-1/6 flex-shrink-0 pr-4 min-w-[150px]' },
};

const orderedColumnIds = ['embarcacao', 'pedidos', 'porto', 'eta', 'etb', 'etd', 'volumePlanejado', 'volumeCarregado', 'status'];

const renderCellContent = (schedule: VesselSchedule, columnId: string) => {
    switch (columnId) {
        case 'embarcacao':
            return <>
                <p className="font-semibold text-foreground truncate">{schedule.vesselName}</p>
                <p className="text-sm text-muted-foreground truncate">{schedule.client}</p>
            </>;
        case 'pedidos':
            return <p className="text-sm text-muted-foreground font-mono truncate">{schedule.orders?.join(', ') || '—'}</p>;
        case 'porto':
            return <p className="text-sm text-muted-foreground truncate">{schedule.port}</p>;
        case 'eta':
            return <p className="text-sm text-muted-foreground font-mono">{formatDateTime(schedule.eta)}</p>;
        case 'etb':
            return <p className="text-sm text-muted-foreground font-mono">{formatDateTime(schedule.etb)}</p>;
        case 'etd':
            return <p className="text-sm text-muted-foreground font-mono">{formatDateTime(schedule.etd)}</p>;
        case 'status':
            const performanceStatus = getPerformanceStatus(schedule);
            return <div className="flex flex-col items-start gap-1">
                <LifecycleStatusBadge status={schedule.status} />
                <PerformanceStatusBadge status={performanceStatus} />
            </div>;
        case 'volumePlanejado':
            return <p className="text-sm text-muted-foreground font-mono">{numberToBr(brToNumber(schedule.plannedVolume || ''), 0) || '—'}</p>;
        case 'volumeCarregado':
            return <p className="text-sm text-muted-foreground font-mono">{numberToBr(brToNumber(schedule.loadedVolume || ''), 0) || '—'}</p>;
        default:
            return null;
    }
};

const ScheduleListItem: React.FC<{ schedule: VesselSchedule, onStartOperation: (id: number) => void, onRegisterArrival: (id: number) => void, visibleColumns: Set<string> }> = ({ schedule, onStartOperation, onRegisterArrival, visibleColumns }) => {
    const renderAction = () => {
        switch (schedule.status) {
            case 'PLANEJADO':
                return <Button variant="ghost" size="sm" className="!p-2" onClick={(e) => { e.stopPropagation(); onStartOperation(schedule.id); }} title="Iniciar Carregamento"><ArrowUpCircleIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" /></Button>;
            case 'EM TRÂNSITO':
                return <Button variant="ghost" size="sm" className="!p-2" onClick={(e) => { e.stopPropagation(); onRegisterArrival(schedule.id); }} title="Registrar Chegada"><GitForkIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" /></Button>;
            default:
                return <div className="h-9 w-9"></div>;
        }
    };
    
    return (
        <div className="flex items-center px-4 py-3 border-b border-border/70 last:border-0 hover:bg-secondary/50">
            {orderedColumnIds.map(id => visibleColumns.has(id) && (
                <div key={id} className={COLUMN_CONFIG[id].className}>
                    {renderCellContent(schedule, id)}
                </div>
            ))}
            <div className="w-[60px] flex-shrink-0 flex justify-center">{renderAction()}</div>
        </div>
    );
};

const ColumnSelector: React.FC<{
    visibleColumns: Set<string>;
    setVisibleColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
}> = ({ visibleColumns, setVisibleColumns }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (id: string) => {
        setVisibleColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    return (
        <div className="relative" ref={ref}>
            <Button variant="secondary" size="sm" onClick={() => setIsOpen(!isOpen)} icon={<Settings2Icon className="h-4 w-4" />}>
                Colunas
            </Button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-card border rounded-lg shadow-lg z-10 p-2">
                    <p className="text-xs font-semibold text-muted-foreground px-2 pb-1">Exibir colunas</p>
                    {orderedColumnIds.map(id => (
                        <label key={id} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={visibleColumns.has(id)}
                                onChange={() => toggleColumn(id)}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                            />
                            <span className="text-sm">{COLUMN_CONFIG[id].label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- MAIN SCREEN COMPONENT ---

interface SchedulingScreenProps {
    schedule: VesselSchedule[];
    setSchedule: React.Dispatch<React.SetStateAction<VesselSchedule[]>>;
    vessels: Vessel[];
    onStartOperation: (scheduleId: number) => void;
    onRegisterArrival: (scheduleId: number) => void;
    onStartDischarge: (scheduleId: number) => void;
    onFinalizeTrip: (scheduleId: number) => void;
    preliminaryData: Partial<VesselSchedule> | null;
    clearPreliminaryData: () => void;
}

export const SchedulingScreen: React.FC<SchedulingScreenProps> = ({ schedule, setSchedule, vessels, onStartOperation, onRegisterArrival, onStartDischarge, onFinalizeTrip, preliminaryData, clearPreliminaryData }) => {
    const [filter, setFilter] = useState<'Todos' | 'Balsa' | 'Navio' | 'Atrasados'>('Todos');
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSchedule, setCurrentSchedule] = useState<VesselSchedule | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<VesselSchedule | null>(null);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set(orderedColumnIds.filter(id => COLUMN_CONFIG[id].default)));

    const displaySchedule = schedule.length > 0 ? schedule : createDummySchedules();

    const filteredSchedules = useMemo(() => {
        return displaySchedule.filter(item => {
            if (filter === 'Todos') return true;
            if (filter === 'Balsa') return item.vesselType === 'Balsa';
            if (filter === 'Navio') return item.vesselType === 'Navio';
            if (filter === 'Atrasados') return getPerformanceStatus(item) === 'ATRASADO';
            return true;
        }).sort((a,b) => new Date(a.etb || 0).getTime() - new Date(b.etb || 0).getTime()).reverse();
    }, [filter, displaySchedule]);

    const handleOpenModal = useCallback((item: VesselSchedule | null, prelimData: Partial<VesselSchedule> | null = null) => {
        if (item) {
            setCurrentSchedule({...item, orders: item.orders || []});
        } else {
            setCurrentSchedule({
                id: Date.now(),
                status: 'PLANEJADO',
                product: 'anidro',
                vesselType: 'Balsa',
                vesselName: '', port: '', client: '',
                tanks: [],
                orders: [],
                ...prelimData,
            });
        }
        setIsModalOpen(true);
    }, []);

    useEffect(() => {
        if (preliminaryData) {
            handleOpenModal(null, preliminaryData);
            clearPreliminaryData();
        }
    }, [preliminaryData, clearPreliminaryData, handleOpenModal]);

    const handleSaveSchedule = (itemToSave: VesselSchedule) => {
        setSchedule(prev => {
            const exists = prev.some(s => s.id === itemToSave.id);
            if (exists) {
                return prev.map(s => s.id === itemToSave.id ? itemToSave : s);
            }
            return [...prev, itemToSave];
        });
        setIsModalOpen(false);
    };

    const handleDeleteSchedule = () => {
        if (scheduleToDelete) {
            setSchedule(prev => prev.filter(s => s.id !== scheduleToDelete.id));
            setScheduleToDelete(null);
        }
    };

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Programação de Embarcações</h1>
                    <p className="text-muted-foreground">Acompanhe as atracações, operações e status de Balsas e Navios.</p>
                </div>
                <Button onClick={() => handleOpenModal(null)} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                    + Nova Programação
                </Button>
            </div>
            
            <div className="mb-6 flex flex-wrap gap-2 justify-between">
                <div className="flex flex-wrap gap-2">
                    {(['Todos', 'Balsa', 'Navio', 'Atrasados'] as const).map(f => (
                        <Button key={f} variant={filter === f ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter(f)}>
                            {f}
                        </Button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                     {viewMode === 'list' && <ColumnSelector visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns} />}
                    <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
                        <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="!p-2">
                            <ListIcon className="h-5 w-5"/>
                        </Button>
                        <Button variant={viewMode === 'card' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('card')} className="!p-2">
                            <LayoutGridIcon className="h-5 w-5"/>
                        </Button>
                    </div>
                </div>
            </div>

            {viewMode === 'card' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                     {filteredSchedules.length > 0 ? (
                        filteredSchedules.map(item => (
                            <Card key={item.id} className="flex flex-col">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg">{item.vesselName}</h3>
                                        <p className="text-sm text-muted-foreground">{item.client}</p>
                                    </div>
                                    <LifecycleStatusBadge status={item.status} />
                                </div>
                                <div className="mt-4 pt-4 border-t text-sm space-y-2 flex-grow">
                                    <p><strong>Porto:</strong> {item.port}</p>
                                    <p><strong>ETB:</strong> {formatDateTime(item.etb)}</p>
                                    <p><strong>Pedidos:</strong> {item.orders?.join(', ') || 'N/A'}</p>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-end">
                                    <Button size="sm" onClick={() => handleOpenModal(item)}>Ver Detalhes</Button>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <Card className="text-center py-12 lg:col-span-2 xl:col-span-3">
                            <ShipIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium">Nenhuma programação encontrada</h3>
                            <p className="text-muted-foreground">Não há itens que correspondam ao filtro selecionado.</p>
                        </Card>
                    )}
                </div>
            )}
            
            {viewMode === 'list' && (
                <Card padding="sm" className="!p-0 overflow-x-auto">
                    <div className="flex items-center px-4 py-2 text-xs text-muted-foreground font-semibold border-b border-border/70 sticky top-0 bg-card/80 backdrop-blur-sm z-10">
                        {orderedColumnIds.map(id => visibleColumns.has(id) && (
                           <div key={id} className={`${COLUMN_CONFIG[id].className}`}>
                                {COLUMN_CONFIG[id].label}
                           </div>
                        ))}
                        <div className="w-[60px] flex-shrink-0 text-center">Ações</div>
                    </div>
                    <div>
                        {filteredSchedules.length > 0 ? (
                            filteredSchedules.map(item => (
                                <ScheduleListItem
                                    key={item.id}
                                    schedule={item}
                                    onStartOperation={onStartOperation}
                                    onRegisterArrival={onRegisterArrival}
                                    visibleColumns={visibleColumns}
                                />
                            ))
                        ) : (
                            <div className="text-center p-12 text-muted-foreground">
                                <ShipIcon className="mx-auto h-10 w-10 mb-2" />
                                <p>Nenhuma programação encontrada para os filtros selecionados.</p>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {isModalOpen && currentSchedule && (
                <ScheduleFormModal 
                    schedule={currentSchedule} 
                    vessels={vessels}
                    onSave={handleSaveSchedule} 
                    onClose={() => setIsModalOpen(false)}
                    onDelete={(item) => {
                        setIsModalOpen(false);
                        setScheduleToDelete(item);
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={!!scheduleToDelete}
                onClose={() => setScheduleToDelete(null)}
                onConfirm={handleDeleteSchedule}
                title="Confirmar Exclusão"
            >
                <p>Tem certeza que deseja excluir a programação para <strong className="text-foreground">{scheduleToDelete?.vesselName}</strong>?</p>
            </ConfirmationModal>
        </main>
    );
};


// --- FORM MODAL COMPONENT ---
interface ScheduleFormModalProps {
    schedule: VesselSchedule;
    vessels: Vessel[];
    onSave: (schedule: VesselSchedule) => void;
    onClose: () => void;
    onDelete: (schedule: VesselSchedule) => void;
}

const OrderManager: React.FC<{
    orders: string[];
    onOrdersChange: (newOrders: string[]) => void;
}> = ({ orders, onOrdersChange }) => {
    const [inputValue, setInputValue] = useState('');

    const addOrder = (order: string) => {
        const value = order.trim();
        if (value && !orders.includes(value)) {
            onOrdersChange([...orders, value]);
        }
    };

    const handleAddClick = () => {
        addOrder(inputValue);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddClick();
        }
    };

    const removeOrder = (orderToRemove: string) => {
        onOrdersChange(orders.filter(o => o !== orderToRemove));
    };

    return (
        <div className="md:col-span-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Pedido(s) da Operação</label>
            <div className="flex flex-wrap gap-2 items-center">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Adicionar número do pedido"
                    className="flex-grow min-w-[200px]"
                    containerClassName="flex-grow"
                />
                <Button variant="secondary" onClick={handleAddClick} icon={<PlusCircleIcon className="h-4 w-4" />}>Adicionar</Button>
            </div>
            {orders.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {orders.map(order => (
                        <span key={order} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                            {order}
                            <button onClick={() => removeOrder(order)} className="text-muted-foreground hover:text-foreground">
                                <XIcon className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};


const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({ schedule, vessels, onSave, onClose, onDelete }) => {
    const [formData, setFormData] = useState(schedule);

    const handleChange = (field: keyof VesselSchedule, value: any) => {
        if (field === 'product') {
            const newProduct = value as ProductType;
            setFormData(prev => ({
                ...prev,
                product: newProduct,
                tanks: prev.tanks.map(tank => ({ ...tank, product: newProduct }))
            }));
        } else {
            setFormData(prev => ({...prev, [field]: value}));
        }
    };
    
    const handleOrdersChange = (newOrders: string[]) => {
        setFormData(prev => ({ ...prev, orders: newOrders }));
    };

    const handleTankChange = (index: number, field: keyof ScheduledTankInOp, value: any) => {
        const newTanks = [...formData.tanks];
        newTanks[index] = {...newTanks[index], [field]: value};
        setFormData(prev => ({...prev, tanks: newTanks}));
    };
    
    const handleAddTank = () => {
        const newTank: ScheduledTankInOp = {
            id: Date.now().toString(),
            tankName: '', 
            product: formData.product, 
            volumeAmbient: '', 
            volume20c: '', 
            inpm: '', 
            seals: []
        };
        setFormData(prev => ({...prev, tanks: [...prev.tanks, newTank]}));
    };

    const handleRemoveTank = (index: number) => {
        setFormData(prev => ({...prev, tanks: prev.tanks.filter((_, i) => i !== index)}));
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" style={{animationDuration: '200ms'}} onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Programação de Embarcação</h2>
                        <p className="text-sm text-muted-foreground">{formData.vesselName || 'Nova Programação'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                
                <main className="p-6 space-y-6 overflow-y-auto">
                    {/* Identificação */}
                    <Card padding="sm">
                        <h3 className="font-semibold mb-3">A) Identificação</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select label="Incoterm" value={formData.incoterm || ''} onChange={e => handleChange('incoterm', e.target.value as Incoterm)}>
                                <option value="FOB">FOB</option>
                                <option value="CIF">CIF</option>
                                <option value="DAP">DAP</option>
                                <option value="DDP">DDP</option>
                                <option value="EXW">EXW</option>
                                <option value="CPT">CPT</option>
                            </Select>
                            <Select label="Tipo de Embarcação" value={formData.vesselType} onChange={e => handleChange('vesselType', e.target.value as VesselOpType)} containerClassName="md:col-span-2">
                                <option>Balsa</option>
                                <option>Navio</option>
                            </Select>
                             <Select label="Nome da Embarcação" value={formData.vesselName} onChange={e => handleChange('vesselName', e.target.value)}>
                                 <option value="" disabled>Selecione</option>
                                 {vessels.filter(v => v.type.startsWith(formData.vesselType.toLowerCase())).map(v => (
                                     <option key={v.id} value={v.name}>{v.name}</option>
                                 ))}
                            </Select>
                            <Select label="Produto da Operação" value={formData.product} onChange={e => handleChange('product', e.target.value as ProductType)}>
                                <option value="anidro">Etanol Anidro</option>
                                <option value="hidratado">Etanol Hidratado</option>
                                <option value="granel">Granel</option>
                            </Select>
                            <Input label="Porto / Terminal / Píer" value={formData.port} onChange={e => handleChange('port', e.target.value)} />
                            <Input label="Cliente / Destino" value={formData.client} onChange={e => handleChange('client', e.target.value)} containerClassName="md:col-span-2" />
                            <OrderManager orders={formData.orders || []} onOrdersChange={handleOrdersChange} />
                        </div>
                    </Card>

                    {/* Planejado */}
                    <Card padding="sm">
                        <h3 className="font-semibold mb-3">B) Planejado (PREVISÃO)</h3>
                        <div className="space-y-4">
                            <Input label="ETA (Chegada na área)" type="datetime-local" value={formData.eta || ''} onChange={e => handleChange('eta', e.target.value)}/>
                            <Input label="ETB (Atracação)" type="datetime-local" value={formData.etb || ''} onChange={e => handleChange('etb', e.target.value)}/>
                            <Input label="ETC_START (Início Operação)" type="datetime-local" value={formData.etcStart || ''} onChange={e => handleChange('etcStart', e.target.value)}/>
                            <Input label="ETC_END (Término Operação)" type="datetime-local" value={formData.etcEnd || ''} onChange={e => handleChange('etcEnd', e.target.value)}/>
                            <Input label="ETD (Saída do berço)" type="datetime-local" value={formData.etd || ''} onChange={e => handleChange('etd', e.target.value)}/>
                            <Input label="Volume Previsto (L)" type="text" value={formData.plannedVolume || ''} onChange={e => handleChange('plannedVolume', e.target.value)} />
                            <Input label="Transit Time Previsto (dias)" type="text" value={formData.plannedTransitTimeDays || ''} onChange={e => handleChange('plannedTransitTimeDays', e.target.value)}/>
                        </div>
                    </Card>
                        
                    {/* Tanques da Operação */}
                    <Card padding="sm">
                        <h3 className="font-semibold mb-3">D) Tanques da Operação</h3>
                        <div className="space-y-4">
                            {formData.tanks.map((tank, index) => {
                                return (
                                <div key={tank.id} className="p-3 bg-secondary/50 rounded-lg space-y-3 relative">
                                    <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => handleRemoveTank(index)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <Input label="Tanque" value={tank.tankName} onChange={e => handleTankChange(index, 'tankName', e.target.value)}/>
                                        <Select label="Produto" value={tank.product} onChange={() => {}} disabled>
                                            <option value="anidro">Anidro</option>
                                            <option value="hidratado">Hidratado</option>
                                            <option value="granel">Granel</option>
                                        </Select>
                                        <Input label="Vol. Ambiente (L)" value={tank.volumeAmbient} onChange={e => handleTankChange(index, 'volumeAmbient', e.target.value)}/>
                                    </div>
                                    <LacreManager lacres={tank.seals} onLacreChange={(seals) => handleTankChange(index, 'seals', seals)} />
                                </div>
                            )})}
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleAddTank} className="mt-4" icon={<PlusCircleIcon className="h-4 w-4"/>}>Adicionar Tanque</Button>
                    </Card>
                </main>

                <footer className="p-4 bg-secondary/50 flex justify-between items-center">
                    <Button variant="destructive" onClick={() => onDelete(formData)}>Excluir</Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={() => onSave(formData)}>Salvar Programação</Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
