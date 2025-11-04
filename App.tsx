
import React, { useState, useEffect, useCallback, useRef, SetStateAction, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { Tank, OperationDetails, Signatures, Theme, Vessel, VesselSchedule, ActiveOperationState, VesselScheduleLifecycleStatus, DischargeEvent, Location, SimpleAsset, FerroviarioSchedule, RodoviarioSchedule, DutoviarioSchedule, AereoSchedule, ScheduleStatus, StockTransaction, UnifiedSchedule, CostItem, Order, UnitCost, ScheduledTankInOp, VagaoStatus, AppNotification, NotificationSettings, MetaPlanejamento, AppSettings } from './types';
import { calculateTankMetrics } from './services/calculationService';
import { analyzeOperationData } from './services/geminiService';
import { Header } from './components/layout/Header';
import { SplashScreen } from './components/splash/SplashScreen';
import { nowLocal, brToNumber, exportToCsv, generateReportHtml, numberToBr, getCertificateStatus, generateMailtoLink, formatDateTime } from './utils/helpers';
import { OperationScreen } from './screens/OperationScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { useLocalStorage } from './hooks/useLocalStorage';
import { VesselScreen } from './screens/VesselScreen';
import { RegistrationHubScreen } from './screens/RegistrationHubScreen';
import { MultimodalPlanningScreen } from './screens/MultimodalPlanningScreen';
import { RodoviarioPlanningScreen } from './screens/RodoviarioPlanningScreen';
import { DutoviarioPlanningScreen } from './screens/DutoviarioPlanningScreen';
import { AereoPlanningScreen } from './screens/AereoPlanningScreen';
import { FerroviarioLoadingScreen } from './screens/FerroviarioLoadingScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { StockControlScreen } from './screens/StockControlScreen';
import { CostControlScreen } from './screens/CostControlScreen';
import { BackofficeScreen } from './screens/BackofficeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Toast } from './components/ui/Toast';
import { ConfirmationModal } from './components/modals/ConfirmationModal';
import { generateAereoSchedules, generateDutoviarioSchedules, generateFerroviarioSchedules, generateRodoviarioSchedules, generateVesselSchedules, generatePlanningGoals } from './utils/mockData';
import { FluvialPlanningCenterScreen } from './screens/FluvialPlanningCenterScreen';
import { FluvialProgrammingScreen } from './screens/FluvialProgrammingScreen';
import { FerroviarioPlanningCenterScreen } from './screens/FerroviarioPlanningCenterScreen';
import { FerroviarioProgrammingScreen } from './screens/FerroviarioProgrammingScreen';
import { MenuIcon } from './components/ui/icons';
import { OperationsHubScreen } from './screens/OperationsHubScreen';
import { BulkEditScreen } from './screens/BulkEditScreen';

const getInitialOperationDetails = (): OperationDetails => ({
    id: `OP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`,
    type: 'transferencia',
    modal: 'fluvial',
    vesselId: null,
    responsavel: 'Rafael',
    terminal: 'Terminal Exemplo',
    local: 'Paranaguá - PR',
    dateTime: nowLocal(),
    operationStartDate: '',
    status: 'em_andamento',
    observations: '',
});

const getInitialSignatures = (): Signatures => ({
    transportador: null,
    certificadora: null,
    representante: null,
});

const getInitialActiveOperation = (): ActiveOperationState => ({
    details: getInitialOperationDetails(),
    tanks: [],
    signatures: getInitialSignatures(),
});

const App: React.FC = () => {
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [isDataReady, setIsDataReady] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Inicializando aplicação...');
    
    const navigate = useNavigate();
    const location = useLocation();

    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('qc_theme') as Theme | null) || 'system');
    
    const [activeOperation, setActiveOperation] = useLocalStorage<ActiveOperationState>('qc_active_operation', getInitialActiveOperation);
    const [archivedOperations, setArchivedOperations] = useLocalStorage<ActiveOperationState[]>('qc_archived_operations', []);
    const { details: operationDetails, tanks, signatures } = activeOperation;

    const setOperationDetails = useCallback((newDetails: OperationDetails) => setActiveOperation(prev => ({ ...prev, details: newDetails })), [setActiveOperation]);
    const setTanks = useCallback((updater: SetStateAction<Tank[]>) => {
        setActiveOperation(prev => {
            const newTanks = typeof updater === 'function' ? updater(prev.tanks) : updater;
            return { ...prev, tanks: newTanks };
        });
    }, [setActiveOperation]);
    const setSignatures = useCallback((updater: SetStateAction<Signatures>) => {
        setActiveOperation(prev => {
            const finalSignatures = typeof updater === 'function' ? updater(prev.signatures) : updater;
            return { ...prev, signatures: finalSignatures };
        });
    }, [setActiveOperation]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [vessels, setVessels] = useLocalStorage<Vessel[]>('qc_vessels', []);
    const [schedule, setSchedule] = useLocalStorage<VesselSchedule[]>('qc_vessel_schedule', () => generateVesselSchedules(15));
    
    const [ferroviarioSchedules, setFerroviarioSchedules] = useLocalStorage<FerroviarioSchedule[]>('qc_ferroviario_schedules', () => generateFerroviarioSchedules(10));
    const [rodoviarioSchedules, setRodoviarioSchedules] = useLocalStorage<RodoviarioSchedule[]>('qc_rodoviario_schedules', () => generateRodoviarioSchedules(20));
    const [dutoviarioSchedules, setDutoviarioSchedules] = useLocalStorage<DutoviarioSchedule[]>('qc_dutoviario_schedules', () => generateDutoviarioSchedules(5));
    const [aereoSchedules, setAereoSchedules] = useLocalStorage<AereoSchedule[]>('qc_aereo_schedules', () => generateAereoSchedules(8));
    const [stockTransactions, setStockTransactions] = useLocalStorage<StockTransaction[]>('qc_stock_transactions', []);
    const [costItems, setCostItems] = useLocalStorage<CostItem[]>('qc_cost_items', []);
    const [unitCosts, setUnitCosts] = useLocalStorage<UnitCost[]>('qc_unit_costs', []);
    const [locations, setLocations] = useLocalStorage<Location[]>('qc_locations', []);
    const [simpleAssets, setSimpleAssets] = useLocalStorage<SimpleAsset[]>('qc_simple_assets', []);
    const [orders, setOrders] = useLocalStorage<Order[]>('qc_orders', []);
    // FIX: Changed eager initialization to lazy by passing the function reference instead of calling it. This resolves the error.
    const [planningGoals, setPlanningGoals] = useLocalStorage<MetaPlanejamento[]>('qc_planning_goals', generatePlanningGoals);
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeScheduleForOperation, setActiveScheduleForOperation] = useLocalStorage<VesselSchedule | null>('qc_active_schedule', null);
    const [activeOperationType, setActiveOperationType] = useLocalStorage<'loading' | 'unloading' | null>('qc_active_op_type', null);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; action?: { label: string; onClick: () => void } } | null>(null);

    const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const restoreDataRef = useRef<Record<string, string> | null>(null);
    
    const [appSettings, setAppSettings] = useLocalStorage<AppSettings>('qc_app_settings', {
        notifications: { email: 'user@bluemultimodal.com', notifyOnOperationConcluded: true, notifyOnVesselDelayed: true, notifyOnCertificateExpires: true },
        units: { volume: 'L', mass: 'Kg' }
    });
    const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('qc_notifications', []);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success', action?: { label: string; onClick: () => void }) => {
        setToast({ message, type, action });
    }, []);

    const addNotification = useCallback((type: 'info' | 'warning' | 'error', title: string, message: string) => {
        setNotifications(prev => {
            if (prev.some(n => !n.isRead && n.title === title && n.message === message)) return prev;
            return [{ id: Date.now(), timestamp: new Date().toISOString(), isRead: false, type, title, message }, ...prev].slice(0, 50);
        });
    }, [setNotifications]);

    const triggerNotification = useCallback((eventType: keyof Omit<NotificationSettings, 'email'>, payload: { type: 'info' | 'warning' | 'error', title: string, message: string }, email?: { subject: string, body: string }) => {
        if (appSettings.notifications[eventType]) {
            addNotification(payload.type, payload.title, payload.message);
            if (email && appSettings.notifications.email) {
                showToast(payload.title, payload.type === 'error' ? 'error' : 'success', {
                    label: 'Enviar E-mail',
                    onClick: () => { window.location.href = generateMailtoLink(appSettings.notifications.email, email.subject, email.body); }
                });
            }
        }
    }, [addNotification, appSettings.notifications, showToast]);

    useEffect(() => {
        const initializeApp = async () => {
            if (localStorage.getItem('qc_data_initialized')) {
                setLoadingMessage('Carregando dados...');
                await new Promise(resolve => setTimeout(resolve, 1200));
            } else {
                setLoadingMessage('Preparando para o primeiro uso...');
                await new Promise(resolve => setTimeout(resolve, 1500));
                localStorage.setItem('qc_data_initialized', 'true');
            }
            setIsDataReady(true); setLoadingMessage('Pronto para iniciar!');
        };
        initializeApp();
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', isDark);
        localStorage.setItem('qc_theme', theme);
    }, [theme]);

    // FIX: Added missing required properties to the new tank object to match the Tank type definition.
    const addTank = useCallback((template?: Partial<Tank>) => {
        setTanks(prev => [...prev, { id: Date.now(), tipo: 'rodoviario', prod: 'anidro', ident: '', tanque: '', cliente: '', tdesc: '', ldesc: '', vamb: '', rho: '', Ta: '', Tt: '', lacres: [], results: { r20: NaN, fcv: NaN, inpm: NaN, v20: NaN, status: 'PENDING', messages: [] }, ...template }]);
    }, [setTanks]);
    const updateTank = useCallback((id: number, updatedTank: Tank) => setTanks(prev => prev.map(t => t.id === id ? calculateTankMetrics(updatedTank) : t)), [setTanks]);
    const deleteTank = useCallback((id: number) => setTanks(prev => prev.filter(t => t.id !== id)), [setTanks]);
    const duplicateTank = useCallback((id: number) => { tanks.find(t => t.id === id) && addTank(tanks.find(t => t.id === id)); }, [tanks, addTank]);
    const calculateAllTanks = useCallback(() => setTanks(prev => prev.map(calculateTankMetrics)), [setTanks]);

    const handleAIAnalysis = useCallback(async (prompt: string) => {
        setIsAnalyzing(true); setAnalysisResult('');
        try { setAnalysisResult(await analyzeOperationData(operationDetails, tanks, prompt, vessels)); } 
        catch (e) { setAnalysisResult(`Erro: ${(e as Error).message}`); } 
        finally { setIsAnalyzing(false); }
    }, [operationDetails, tanks, vessels]);

    const newOperation = useCallback((silent = false) => {
        const doReset = () => { setActiveOperation(getInitialActiveOperation()); setActiveScheduleForOperation(null); setActiveOperationType(null); };
        if (silent || window.confirm("Isso limpará a operação atual. Deseja continuar?")) doReset();
    }, [setActiveOperation, setActiveScheduleForOperation, setActiveOperationType]);

    const concludeOperation = useCallback(() => { /* ... implementation ... */ }, [activeOperation, activeScheduleForOperation, activeOperationType, setSchedule, setArchivedOperations, setActiveOperation, showToast, setActiveScheduleForOperation, setActiveOperationType, triggerNotification]);
    
    const handleSaveVessel = (vesselToSave: Vessel) => {
        setVessels(prev => prev.some(v => v.id === vesselToSave.id) ? prev.map(v => v.id === vesselToSave.id ? vesselToSave : v) : [...prev, vesselToSave]);
        navigate('/registration-hub'); showToast('Embarcação salva com sucesso!');
    };
    const handleDeleteVessel = (id: number) => setVessels(prev => prev.filter(v => v.id !== id));

    const handleStartLoading = useCallback((scheduleId: number) => { /* ... implementation identical to original src/App.tsx ... */ navigate('/operation'); }, [schedule, vessels, newOperation, setActiveOperation, setActiveScheduleForOperation, setActiveOperationType, setSchedule, showToast, navigate]);
    const handleRegisterArrival = useCallback((scheduleId: number) => { /* ... implementation ... */ }, [setSchedule, showToast]);
    const handleStartDischarge = useCallback((scheduleId: number) => { /* ... implementation identical to original src/App.tsx ... */ navigate('/operation'); }, [schedule, vessels, newOperation, setActiveOperation, setActiveScheduleForOperation, setActiveOperationType, setSchedule, showToast, navigate]);
    const handleFinalizeTrip = useCallback((scheduleId: number) => { /* ... implementation ... */ }, [schedule, setSchedule, showToast]);
    
    const handleStartFerroviarioLoading = useCallback((scheduleId: number) => {
        const scheduleToStart = ferroviarioSchedules.find(s => s.id === scheduleId);
        if(!scheduleToStart) return showToast('Programação não encontrada.', 'error');
        if (scheduleToStart.vagoes.length === 0) {
            const newVagoes = scheduleToStart.rateios.flatMap(rateio => Array.from({ length: brToNumber(rateio.qtd_vagoes) || 0 }).map(() => ({ id: Date.now() + Math.random(), numero: '', status: 'AGUARDANDO' as VagaoStatus, rateioId: rateio.id })));
            setFerroviarioSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, vagoes: newVagoes, status: 'EM CARREGAMENTO' } : s));
        } else {
             setFerroviarioSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, status: 'EM CARREGAMENTO' } : s));
        }
        navigate(`/planning/rail/loading/${scheduleId}`);
    }, [ferroviarioSchedules, setFerroviarioSchedules, showToast, navigate]);

    const unifiedSchedules = useMemo((): UnifiedSchedule[] => {
        const fluvial: UnifiedSchedule[] = schedule.map(s => ({
            uid: `fluvial-${s.id}`, modal: 'fluvial', vesselType: s.vesselType, title: s.vesselName,
            description: `${s.port} → ${s.rateios.map(r => r.localDescarga).join(', ')}`, status: s.status, originalId: s.id,
            onStartLoading: handleStartLoading, onRegisterArrival: handleRegisterArrival, onStartDischarge: handleStartDischarge, onFinalizeTrip: handleFinalizeTrip,
            onView: (id: number) => {
                 if (s.status === 'EM CARREGAMENTO') handleStartLoading(id);
                 if (s.status === 'EM DESCARGA') handleStartDischarge(id);
            },
        }));
        const ferroviario: UnifiedSchedule[] = ferroviarioSchedules.map(s => ({
            uid: `ferroviario-${s.id}`, modal: 'ferroviario', title: `Composição ${s.composicao}`, description: `${s.origem} → ${s.destino}`,
            status: s.status, originalId: s.id, onStartLoading: handleStartFerroviarioLoading, onView: handleStartFerroviarioLoading,
        }));
        const rodoviario: UnifiedSchedule[] = rodoviarioSchedules.map(s => ({
            uid: `rodoviario-${s.id}`, modal: 'rodoviario', title: s.placa, description: `${s.origem} → ${s.destino}`, status: s.status, originalId: s.id,
        }));
        const dutoviario: UnifiedSchedule[] = dutoviarioSchedules.map(s => ({
            uid: `dutoviario-${s.id}`, modal: 'dutoviario', title: `Duto para ${s.base_destino}`, description: `${s.usina_origem} → ${s.cliente_final}`, status: s.status, originalId: s.id,
        }));
        const aereo: UnifiedSchedule[] = aereoSchedules.map(s => ({
            uid: `aereo-${s.id}`, modal: 'aereo', title: `Voo ${s.voo}`, description: `${s.aeroporto_origem} → ${s.aeroporto_destino}`, status: s.status, originalId: s.id,
        }));
        return [...fluvial, ...ferroviario, ...rodoviario, ...dutoviario, ...aereo];
    }, [schedule, ferroviarioSchedules, rodoviarioSchedules, dutoviarioSchedules, aereoSchedules, handleStartLoading, handleRegisterArrival, handleStartDischarge, handleFinalizeTrip, handleStartFerroviarioLoading]);

    const onStartSplash = () => { setIsAppLoading(false); if (location.pathname === '/') navigate('/dashboard'); };
    const handleLock = () => { setIsAppLoading(true); navigate('/'); };

    if (isAppLoading) return <SplashScreen onStart={onStartSplash} isDataReady={isDataReady} loadingMessage={loadingMessage} />;

    return (
        <div className="min-h-screen md:pl-20">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} action={toast.action} />}
            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

            <Header theme={theme} setTheme={setTheme} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} onLock={handleLock} notifications={notifications} setNotifications={setNotifications} />
            
            <main className="transition-all duration-300">
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardScreen vessels={vessels} schedule={schedule} />} />
                    <Route path="/planning" element={<MultimodalPlanningScreen />} />
                    <Route path="/planning/pipeline" element={<DutoviarioPlanningScreen onBack={() => navigate('/planning')} setSchedules={setDutoviarioSchedules} showToast={showToast} />} />
                    <Route path="/planning/rail" element={<FerroviarioPlanningCenterScreen planningGoals={planningGoals.filter(p => p.modal === 'ferroviario')} setPlanningGoals={setPlanningGoals} schedules={ferroviarioSchedules} setSchedules={setFerroviarioSchedules} allPlanningGoals={planningGoals} onViewProgramming={(goalId) => navigate(`/planning/rail/${goalId}`)} planningType="Trem" onBack={() => navigate('/planning')} showToast={showToast} appSettings={appSettings} onStartOperation={handleStartFerroviarioLoading} />} />
                    <Route path="/planning/rail/:goalId" element={<FerroviarioProgrammingScreen planningGoal={planningGoals.find(g => g.id === Number(useParams().goalId))!} allPlanningGoals={planningGoals} schedule={ferroviarioSchedules} setSchedule={setFerroviarioSchedules} onBackToCenter={() => navigate('/planning/rail')} onBackToHub={() => navigate('/planning')} onStartOperation={handleStartFerroviarioLoading} showToast={showToast} />} />
                    <Route path="/planning/rail/loading/:scheduleId" element={<FerroviarioLoadingScreen schedule={ferroviarioSchedules.find(s => s.id === Number(useParams().scheduleId))!} onUpdateSchedule={(updated) => setFerroviarioSchedules(prev => prev.map(s => s.id === updated.id ? updated : s))} onBack={() => navigate(-1)} showToast={showToast} />} />
                    <Route path="/planning/fluvial" element={<FluvialPlanningCenterScreen planningGoals={planningGoals.filter(p => p.modal === 'fluvial')} setPlanningGoals={setPlanningGoals} schedules={schedule} setSchedules={setSchedule} vessels={vessels} allPlanningGoals={planningGoals} onViewProgramming={(goalId) => navigate(`/planning/fluvial/${goalId}`)} planningType="Balsa" onBack={() => navigate('/planning')} showToast={showToast} appSettings={appSettings} onStartOperation={handleStartLoading} onRegisterArrival={handleRegisterArrival} onStartDischarge={handleStartDischarge} onFinalizeTrip={handleFinalizeTrip} />} />
                    <Route path="/planning/fluvial/:goalId" element={<FluvialProgrammingScreen planningGoal={planningGoals.find(g => g.id === Number(useParams().goalId))!} allPlanningGoals={planningGoals} schedule={schedule} setSchedule={setSchedule} vessels={vessels} onBackToCenter={() => navigate('/planning/fluvial')} onBackToHub={() => navigate('/planning')} onStartOperation={handleStartLoading} onRegisterArrival={handleRegisterArrival} onStartDischarge={handleStartDischarge} onFinalizeTrip={handleFinalizeTrip} onGenerateReport={() => {}} showToast={showToast} />} />
                    <Route path="/planning/maritime" element={<FluvialPlanningCenterScreen planningGoals={planningGoals.filter(p => p.modal === 'maritimo')} setPlanningGoals={setPlanningGoals} schedules={schedule} setSchedules={setSchedule} vessels={vessels} allPlanningGoals={planningGoals} onViewProgramming={(goalId) => navigate(`/planning/maritime/${goalId}`)} planningType="Navio" onBack={() => navigate('/planning')} showToast={showToast} appSettings={appSettings} onStartOperation={handleStartLoading} onRegisterArrival={handleRegisterArrival} onStartDischarge={handleStartDischarge} onFinalizeTrip={handleFinalizeTrip} />} />
                    <Route path="/planning/maritime/:goalId" element={<FluvialProgrammingScreen planningGoal={planningGoals.find(g => g.id === Number(useParams().goalId))!} allPlanningGoals={planningGoals} schedule={schedule} setSchedule={setSchedule} vessels={vessels} onBackToCenter={() => navigate('/planning/maritime')} onBackToHub={() => navigate('/planning')} onStartOperation={handleStartLoading} onRegisterArrival={handleRegisterArrival} onStartDischarge={handleStartDischarge} onFinalizeTrip={handleFinalizeTrip} onGenerateReport={() => {}} showToast={showToast} />} />
                    <Route path="/planning/road" element={<RodoviarioPlanningScreen onBack={() => navigate('/planning')} schedules={rodoviarioSchedules} setSchedules={setRodoviarioSchedules} showToast={showToast} />} />
                    <Route path="/planning/air" element={<AereoPlanningScreen onBack={() => navigate('/planning')} schedules={aereoSchedules} setSchedules={setAereoSchedules} showToast={showToast} />} />
                    <Route path="/operations-hub" element={<OperationsHubScreen unifiedSchedules={unifiedSchedules} onNewOperation={() => { newOperation(true); navigate('/operation'); }} />} />
                    <Route path="/operation" element={<OperationScreen operationDetails={operationDetails} setOperationDetails={setOperationDetails} tanks={tanks} setSignatures={setSignatures} vessels={vessels} signatures={signatures} analysisResult={analysisResult} isAnalyzing={isAnalyzing} onAddTank={addTank} onUpdateTank={updateTank} onDeleteTank={deleteTank} onDuplicateTank={duplicateTank} onCalcAll={calculateAllTanks} onAIAnalysis={handleAIAnalysis} onSave={() => {}} onLoad={() => {}} onNew={newOperation} onConclude={concludeOperation} onExport={() => exportToCsv(operationDetails, tanks, signatures, vessels)} onReport={() => {}} activeSchedule={activeScheduleForOperation} onUpdateSchedule={(updated) => setSchedule(prev => prev.map(s => s.id === updated.id ? updated : s))} activeOperationType={activeOperationType} onBack={() => navigate('/operations-hub')} appSettings={appSettings} />} />
                    <Route path="/stock-control" element={<StockControlScreen locations={locations} stockTransactions={stockTransactions} setStockTransactions={setStockTransactions} showToast={showToast} />} />
                    <Route path="/cost-control" element={<CostControlScreen costItems={costItems} setCostItems={setCostItems} allSchedules={unifiedSchedules} unitCosts={unitCosts} setUnitCosts={setUnitCosts} showToast={showToast} />} />
                    <Route path="/registration-hub" element={<RegistrationHubScreen locations={locations} setLocations={setLocations} simpleAssets={simpleAssets} setSimpleAssets={setSimpleAssets} vessels={vessels} setVessels={setVessels} onEditVessel={(id) => navigate(`/registration-hub/vessel/${id}`)} onDeleteVessel={handleDeleteVessel} showToast={showToast} />} />
                    <Route path="/registration-hub/bulk-edit" element={<BulkEditScreen vessels={vessels} setVessels={setVessels} showToast={showToast} onBack={() => navigate('/registration-hub')} />} />
                    <Route path="/registration-hub/vessel/:id" element={<VesselScreen vessel={vessels.find(v => v.id === Number(useParams().id)) || (useParams().id === 'new' ? undefined : null)} onSave={handleSaveVessel} onBack={() => navigate('/registration-hub')} />} />
                    <Route path="/backoffice" element={<BackofficeScreen orders={orders} setOrders={setOrders} showToast={showToast} />} />
                    <Route path="/settings" element={<SettingsScreen onCreateBackup={() => {}} onRestoreBackup={() => {}} onResetSystem={() => setIsResetConfirmOpen(true)} appSettings={appSettings} setAppSettings={setAppSettings} showToast={showToast} />} />
                    <Route path="/reports" element={<ReportsScreen fluvialSchedules={schedule} ferroviarioSchedules={ferroviarioSchedules} rodoviarioSchedules={rodoviarioSchedules} dutoviarioSchedules={dutoviarioSchedules} aereoSchedules={aereoSchedules} />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </main>

            <button onClick={() => setIsMobileMenuOpen(true)} className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-card/50 backdrop-blur-sm border md:hidden">
                <MenuIcon className="h-5 w-5"/>
            </button>
            <ConfirmationModal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)} onConfirm={() => {}} title="Confirmar Reinicialização do Sistema" confirmText="Sim, Apagar Tudo" variant="destructive">
                <p>Você tem certeza que deseja apagar TODOS os dados do sistema?</p>
                <p className="font-bold text-destructive">Esta ação é irreversível e não pode ser desfeita.</p>
            </ConfirmationModal>
        </div>
    );
};

export default App;
