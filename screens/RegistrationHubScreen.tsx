import React, { useState, useMemo, SetStateAction, useRef } from 'react';
import { Location, LocationType, SimpleAsset, SimpleAssetType, Vessel, EquipmentType, VesselTank, CalibrationPoint, MeasurementLog, MeasurementOperationType, TankWagon } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlusCircleIcon, XIcon, PenSquareIcon, Trash2Icon, ShipIcon, TrainFrontIcon, PackageIcon, SearchIcon } from '../components/ui/icons';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { getCertificateStatus } from '../utils/helpers';

const locationTypeLabels: Record<LocationType, string> = {
    'armazem-granel': 'Armazém de Graneis',
    'terminal-liquido': 'Terminal de Líquidos',
    'recinto-alfandegado': 'Recinto Alfandegado',
};

const simpleAssetTypeLabels: Record<SimpleAssetType, string> = {
    'tanque-terra': 'Tanque de Terra',
    'vagao-tanque': 'Vagão-tanque',
    'vagao-granel': 'Vagão-granel',
    'container': 'Container',
};

type ModalState = {
    isOpen: boolean;
    type: 'location' | 'asset' | null;
    data: Location | SimpleAsset | null;
};

interface RegistrationHubScreenProps {
    locations: Location[];
    setLocations: React.Dispatch<SetStateAction<Location[]>>;
    simpleAssets: SimpleAsset[];
    setSimpleAssets: React.Dispatch<SetStateAction<SimpleAsset[]>>;
    vessels: Vessel[];
    onEditVessel: (id: number | 'new') => void;
    onDeleteVessel: (id: number) => void;
    onImportVessel: (file: File) => void;
    tankWagons: TankWagon[];
    onEditTankWagon: (id: number | 'new') => void;
    onDeleteTankWagon: (id: number) => void;
    onImportTankWagon: () => void;
}

const AssetChoiceModal: React.FC<{
    onClose: () => void;
    onSelect: (type: 'simple' | 'vessel' | 'tankWagon') => void;
}> = ({ onClose, onSelect }) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Selecione o Tipo de Ativo</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <div className="p-6 space-y-4">
                    <Button className="w-full justify-start text-base py-6" variant="secondary" onClick={() => onSelect('simple')}>
                        <PackageIcon className="h-5 w-5 mr-3" />
                        <div>
                            <p className="font-semibold">Ativo Simples</p>
                            <p className="font-normal text-xs text-muted-foreground">Tanque de terra, container, etc.</p>
                        </div>
                    </Button>
                     <Button className="w-full justify-start text-base py-6" variant="secondary" onClick={() => onSelect('tankWagon')}>
                        <TrainFrontIcon className="h-5 w-5 mr-3"/>
                        <div>
                             <p className="font-semibold">Vagão-Tanque</p>
                             <p className="font-normal text-xs text-muted-foreground">Vagões ferroviários com tabela de aferição.</p>
                        </div>
                    </Button>
                    <Button className="w-full justify-start text-base py-6" variant="secondary" onClick={() => onSelect('vessel')}>
                        <ShipIcon className="h-5 w-5 mr-3" />
                        <div>
                             <p className="font-semibold">Embarcação</p>
                             <p className="font-normal text-xs text-muted-foreground">Balsa-tanque, Navio-tanque, etc.</p>
                        </div>
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- Asset Cards ---
const VesselCard: React.FC<{vessel: Vessel, onEdit: (id: number) => void, onDelete: (item: Vessel) => void}> = ({ vessel, onEdit, onDelete }) => {
    const certStatus = getCertificateStatus(vessel.expiryDate);
    const vettingStatus = getCertificateStatus(vessel.vettingExpiryDate || '');
    return (
        <Card padding="md" className="flex flex-col">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-foreground pr-4">{vessel.name}</h3>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded capitalize">{vessel.type.replace('-', ' ')}</span>
            </div>
            <p className="text-sm text-muted-foreground">{vessel.tanks.length} tanques</p>
            <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm flex-grow">
                <div className="flex justify-between"><span>Cert. Arqueação:</span> <span className={`${certStatus.color} font-semibold`}>{certStatus.text}</span></div>
                <div className="flex justify-between"><span>Validade Vetting:</span> <span className={`${vettingStatus.color} font-semibold`}>{vettingStatus.text}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onDelete(vessel)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                <Button variant="secondary" size="sm" onClick={() => onEdit(vessel.id)}>Gerenciar</Button>
            </div>
        </Card>
    );
};

const TankWagonCard: React.FC<{wagon: TankWagon, onEdit: (id: number) => void, onDelete: (item: TankWagon) => void}> = ({ wagon, onEdit, onDelete }) => {
    const certStatus = getCertificateStatus(wagon.validUntil || '');
    return (
        <Card padding="md" className="flex flex-col">
            <h3 className="font-bold text-lg text-foreground">{wagon.name}</h3>
            <p className="text-sm text-muted-foreground">Nº Certificado: {wagon.certificateNumber || 'N/A'}</p>
             <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm flex-grow">
                <div className="flex justify-between"><span>Validade Cert.:</span> <span className={`${certStatus.color} font-semibold`}>{certStatus.text}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onDelete(wagon)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                <Button variant="secondary" size="sm" onClick={() => onEdit(wagon.id)}>Gerenciar</Button>
            </div>
        </Card>
    );
};

const SimpleAssetCard: React.FC<{asset: SimpleAsset, locationName: string, onEdit: (item: SimpleAsset) => void, onDelete: (item: SimpleAsset) => void}> = ({ asset, locationName, onEdit, onDelete }) => {
     return (
        <Card padding="md" className="flex flex-col">
            <h3 className="font-bold text-lg text-foreground">{asset.name}</h3>
            <p className="text-sm text-muted-foreground">{simpleAssetTypeLabels[asset.type]}</p>
             <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm flex-grow">
                {asset.capacity && <div className="flex justify-between"><span>Capacidade:</span> <span className="font-semibold">{asset.capacity.toLocaleString('pt-BR')} {asset.unit}</span></div>}
                <div className="flex justify-between"><span>Local:</span> <span className="font-semibold">{locationName}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onDelete(asset)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                <Button variant="secondary" size="sm" onClick={() => onEdit(asset)}>Editar</Button>
            </div>
        </Card>
    );
};


export const RegistrationHubScreen: React.FC<RegistrationHubScreenProps> = ({
    locations, setLocations, simpleAssets, setSimpleAssets, vessels, onEditVessel, onDeleteVessel, onImportVessel, tankWagons, onEditTankWagon, onDeleteTankWagon, onImportTankWagon
}) => {
    const [activeTab, setActiveTab] = useState<'locations' | 'assets'>('assets');
    const [activeAssetTab, setActiveAssetTab] = useState<'vessels' | 'tankWagons' | 'simple'>('vessels');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, type: null, data: null });
    const [itemToDelete, setItemToDelete] = useState<{ type: 'location' | 'asset' | 'vessel' | 'tankWagon', item: Location | SimpleAsset | Vessel | TankWagon } | null>(null);
    const [isAssetChoiceModalOpen, setIsAssetChoiceModalOpen] = useState(false);
    const vesselImportRef = useRef<HTMLInputElement>(null);
    
    const openModal = (type: 'location' | 'asset', data: Location | SimpleAsset | null = null) => {
        setModalState({ isOpen: true, type, data });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, type: null, data: null });
    };

    const handleSave = (item: Location | SimpleAsset) => {
        if (modalState.type === 'location') {
            const loc = item as Location;
            setLocations(prev => {
                const exists = prev.some(l => l.id === loc.id);
                return exists ? prev.map(l => l.id === loc.id ? loc : l) : [...prev, loc];
            });
        } else if (modalState.type === 'asset') {
            const asset = item as SimpleAsset;
            setSimpleAssets(prev => {
                const exists = prev.some(a => a.id === asset.id);
                return exists ? prev.map(a => a.id === asset.id ? asset : a) : [...prev, asset];
            });
        }
        closeModal();
    };

    const handleDelete = (type: 'location' | 'asset' | 'vessel' | 'tankWagon', item: Location | SimpleAsset | Vessel | TankWagon) => {
        setItemToDelete({ type, item });
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === 'location') {
            setLocations(prev => prev.filter(l => l.id !== itemToDelete.item.id));
        } else if (itemToDelete.type === 'asset') {
            setSimpleAssets(prev => prev.filter(a => a.id !== itemToDelete.item.id));
        } else if (itemToDelete.type === 'vessel') {
            onDeleteVessel((itemToDelete.item as Vessel).id);
        } else if (itemToDelete.type === 'tankWagon') {
            onDeleteTankWagon((itemToDelete.item as TankWagon).id);
        }
        setItemToDelete(null);
    };

    const handleAssetTypeSelect = (type: 'simple' | 'vessel' | 'tankWagon') => {
        setIsAssetChoiceModalOpen(false);
        if (type === 'simple') {
            openModal('asset');
        } else if (type === 'vessel') {
            onEditVessel('new');
        } else if (type === 'tankWagon') {
            onEditTankWagon('new');
        }
    };

    const handleTabChange = (tab: 'locations' | 'assets') => {
        setActiveTab(tab);
        setSearchTerm('');
    };
    
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImportVessel(file);
            if (vesselImportRef.current) {
                vesselImportRef.current.value = "";
            }
        }
    };

    const filteredLocations = useMemo(() => {
        return locations.filter(loc => loc.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [locations, searchTerm]);
    
    const filteredVessels = useMemo(() => {
        return vessels.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [vessels, searchTerm]);

    const filteredTankWagons = useMemo(() => {
        return tankWagons.filter(tw => tw.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [tankWagons, searchTerm]);

    const filteredSimpleAssets = useMemo(() => {
        return simpleAssets.filter(sa => sa.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [simpleAssets, searchTerm]);

    const assetTabs = [
        { id: 'vessels', label: 'Embarcações', icon: <ShipIcon className="h-4 w-4" />, count: filteredVessels.length },
        { id: 'tankWagons', label: 'Vagões-Tanque', icon: <TrainFrontIcon className="h-4 w-4" />, count: filteredTankWagons.length },
        { id: 'simple', label: 'Outros Ativos', icon: <PackageIcon className="h-4 w-4" />, count: filteredSimpleAssets.length },
    ];

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Central de Cadastros</h1>
                    <p className="text-muted-foreground">Gerencie os dados mestres da sua operação.</p>
                </div>
                 <Button onClick={() => setIsAssetChoiceModalOpen(true)} icon={<PlusCircleIcon className="h-4 w-4"/>}>Novo Ativo</Button>
            </div>
            
             <div className="border-b mb-6">
                 <nav className="flex gap-4">
                    <button onClick={() => handleTabChange('locations')} className={`py-2 px-1 border-b-2 font-semibold transition-colors ${activeTab === 'locations' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        Locais
                    </button>
                    <button onClick={() => handleTabChange('assets')} className={`py-2 px-1 border-b-2 font-semibold transition-colors ${activeTab === 'assets' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        Ativos
                    </button>
                 </nav>
            </div>
            
            <div className="relative mb-6">
                <Input 
                    placeholder={`Pesquisar em ${activeTab === 'locations' ? 'locais' : 'ativos'}...`}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>

            {activeTab === 'locations' && (
                <Card className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Locais Cadastrados ({filteredLocations.length})</h2>
                        <Button onClick={() => openModal('location')} icon={<PlusCircleIcon className="h-4 w-4"/>}>Novo Local</Button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b-0">
                                <tr className="text-left text-muted-foreground"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Cidade/UF</th><th className="p-3 font-medium text-right">Ações</th></tr>
                            </thead>
                             <tbody>
                                {filteredLocations.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">Nenhum local encontrado.</td></tr>
                                ) : filteredLocations.map(loc => (
                                    <tr key={loc.id} className="border-b last:border-0 hover:bg-secondary/50">
                                        <td className="p-3 font-medium">{loc.name}</td><td className="p-3">{locationTypeLabels[loc.type]}</td><td className="p-3">{loc.city} - {loc.state}</td>
                                        <td className="p-3 text-right">
                                             <Button variant="ghost" size="sm" onClick={() => openModal('location', loc)}><PenSquareIcon className="h-4 w-4"/></Button>
                                             <Button variant="ghost" size="sm" onClick={() => handleDelete('location', loc)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                                        </td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'assets' && (
                 <div className="animate-fade-in">
                    <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
                        <div className="flex gap-2 border-b">
                            {assetTabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveAssetTab(tab.id as any)} className={`flex items-center gap-2 py-2 px-3 border-b-2 font-semibold transition-colors ${activeAssetTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                                    {tab.icon} {tab.label} <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{tab.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {activeAssetTab === 'vessels' && (
                        <div>
                             <div className="flex justify-end mb-4">
                                <input type="file" ref={vesselImportRef} onChange={handleFileImport} accept=".txt,text/plain" className="hidden" />
                                <Button variant="secondary" onClick={() => vesselImportRef.current?.click()}>
                                    Importar Embarcações (TXT)
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredVessels.map(vessel => <VesselCard key={vessel.id} vessel={vessel} onEdit={() => onEditVessel(vessel.id)} onDelete={() => handleDelete('vessel', vessel)}/>)}
                                {filteredVessels.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Nenhuma embarcação encontrada.</p>}
                            </div>
                        </div>
                    )}
                     {activeAssetTab === 'tankWagons' && (
                        <div>
                            <div className="flex justify-end mb-4">
                                <Button variant="secondary" onClick={onImportTankWagon}>
                                    Importar Certificado de Vagão
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTankWagons.map(wagon => <TankWagonCard key={wagon.id} wagon={wagon} onEdit={() => onEditTankWagon(wagon.id)} onDelete={() => handleDelete('tankWagon', wagon)}/>)}
                                {filteredTankWagons.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Nenhum vagão-tanque encontrado.</p>}
                            </div>
                        </div>
                    )}
                     {activeAssetTab === 'simple' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredSimpleAssets.map(asset => {
                                const locationName = locations.find(l => l.id === asset.locationId)?.name || 'N/A';
                                return <SimpleAssetCard key={asset.id} asset={asset} locationName={locationName} onEdit={() => openModal('asset', asset)} onDelete={() => handleDelete('asset', asset)}/>
                            })}
                            {filteredSimpleAssets.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Nenhum ativo simples encontrado.</p>}
                        </div>
                    )}
                 </div>
            )}

            {modalState.isOpen && ( <RegistrationFormModal state={modalState} onClose={closeModal} onSave={handleSave} locations={locations} /> )}
            {isAssetChoiceModalOpen && ( <AssetChoiceModal onClose={() => setIsAssetChoiceModalOpen(false)} onSelect={handleAssetTypeSelect} /> )}
            <ConfirmationModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={confirmDelete} title={`Confirmar Exclusão`}>
                <p>Tem certeza que deseja excluir o item <strong className="text-foreground">{itemToDelete?.item.name}</strong>?</p>
                {itemToDelete?.type === 'vessel' && <p className="font-bold text-destructive mt-2">Isto removerá todos os dados de tanques e calibração associados a esta embarcação.</p>}
                <p className="mt-2">Esta ação não pode ser desfeita.</p>
            </ConfirmationModal>
        </main>
    );
};

// --- Form Modal for Simple Assets and Locations ---
interface FormModalProps { state: ModalState; onClose: () => void; onSave: (item: Location | SimpleAsset) => void; locations: Location[]; }
const RegistrationFormModal: React.FC<FormModalProps> = ({ state, onClose, onSave, locations }) => {
    const isLocation = state.type === 'location';
    const isNew = !state.data;
    const [formData, setFormData] = useState(() => isNew ? (isLocation ? { id: Date.now(), type: 'terminal-liquido', name: '', city: '', state: '' } : { id: Date.now(), type: 'tanque-terra', name: '', capacity: 0, unit: 'liters', locationId: undefined }) : state.data);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev!, [name]: value}));
    };
    const handleSaveClick = () => { onSave(formData as Location | SimpleAsset); };
    const title = isNew ? (isLocation ? 'Novo Local' : 'Novo Ativo Simples') : (isLocation ? 'Editar Local' : 'Editar Ativo Simples');

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center"><h2 className="text-xl font-bold">{title}</h2><Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button></header>
                <main className="p-6 space-y-4">
                    {isLocation ? (
                        <>
                            <Select label="Tipo de Local" name="type" value={(formData as Location).type} onChange={handleChange}>{Object.entries(locationTypeLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</Select>
                            <Input label="Nome" name="name" value={formData.name} onChange={handleChange} />
                            <div className="grid grid-cols-2 gap-4"><Input label="Cidade" name="city" value={(formData as Location).city} onChange={handleChange} /><Input label="Estado (UF)" name="state" value={(formData as Location).state} onChange={handleChange} maxLength={2} /></div>
                        </>
                    ) : (
                         <>
                            <Select label="Tipo de Ativo" name="type" value={(formData as SimpleAsset).type} onChange={handleChange}>{Object.entries(simpleAssetTypeLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</Select>
                            <Input label="Nome / Identificação" name="name" value={formData.name} onChange={handleChange} />
                             <div className="grid grid-cols-2 gap-4">
                                <Input label="Capacidade" name="capacity" type="number" value={(formData as SimpleAsset).capacity || ''} onChange={handleChange} />
                                <Select label="Unidade" name="unit" value={(formData as SimpleAsset).unit} onChange={handleChange}><option value="liters">Litros</option><option value="kg">Kg</option></Select>
                            </div>
                            <Select label="Localização (Opcional)" name="locationId" value={(formData as SimpleAsset).locationId || ''} onChange={handleChange}><option value="">Nenhuma</option>{locations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}</Select>
                        </>
                    )}
                </main>
                 <footer className="p-4 bg-secondary/50 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={handleSaveClick}>Salvar</Button></footer>
            </div>
        </div>
    );
};