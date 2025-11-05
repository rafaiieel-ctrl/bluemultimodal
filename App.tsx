import React, { useState, useEffect, useCallback, useRef, SetStateAction, useMemo } from 'react';
import { Tank, OperationDetails, Signatures, Theme, View, Vessel, VesselSchedule, VesselTank, ActiveOperationState, VesselScheduleLifecycleStatus, DischargeEvent, DischargeTankMeasurement, ProductType, ModalType, Incoterm, Location, SimpleAsset, TankWagon, CalibrationPoint, EquipmentType } from './types';
import { calculateTankMetrics, ANP, interpolate } from './services/calculationService';
import { analyzeOperationData } from './services/geminiService';
import { Header } from './components/layout/Header';
import { nowLocal, brToNumber, exportToCsv, generateReportHtml, numberToBr } from './utils/helpers';
import { OperationScreen } from './screens/OperationScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { useLocalStorage } from './hooks/useLocalStorage';
import { VesselScreen } from './screens/VesselScreen';
import { Breadcrumb } from './components/ui/Breadcrumb';
import { OperationsHubScreen } from './screens/OperationsHubScreen';
import { PlanningHubScreen } from './screens/PlanningHubScreen';
import { RegistrationHubScreen } from './screens/RegistrationHubScreen';
import { TankWagonScreen } from './screens/TankWagonScreen';
import { TankWagonImportScreen } from './screens/TankWagonImportScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LoginScreen } from './screens/LoginScreen';

const getInitialOperationDetails = (): OperationDetails => ({
    id: `OP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`,
    type: 'transferencia',
    modal: 'fluvial',
    vesselId: null,
    responsavel: 'Rafael',
    terminal: 'Terminal Exemplo',
    local: 'Paranaguá - PR',
    dateTime: nowLocal(),
    status: 'em_andamento',
});

const getInitialSignatures = (): Signatures => ({
    transportador: null,
    certificadora: null,
    representante: null,
});

const getInitialActiveOperation = (): ActiveOperationState => ({
    details: getInitialOperationDetails(),
    tanks: [], // Will be populated by useEffect
    signatures: getInitialSignatures(),
});

const LOCAL_STORAGE_KEYS = [
    'qc_active_operation', 'qc_archived_operations', 'qc_vessels', 'qc_tank_wagons', 
    'qc_vessel_schedule', 'qc_locations', 'qc_simple_assets', 'qc_active_schedule_id',
    'qc_nav_order', 'qc_dashboard_order', 'qc_theme'
];


const App: React.FC = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('qc_theme') as Theme | null;
        return savedTheme || 'system';
    });
    const [activeView, setActiveView] = useState<View>('login');
    
    // --- State Refactor for Auto-Save ---
    const [activeOperation, setActiveOperation] = useLocalStorage<ActiveOperationState>('qc_active_operation', getInitialActiveOperation());
    const [archivedOperations, setArchivedOperations] = useLocalStorage<ActiveOperationState[]>('qc_archived_operations', []);
    const { details: operationDetails, tanks, signatures } = activeOperation;

    const setOperationDetails = useCallback((newDetails: OperationDetails) => {
        setActiveOperation(prev => ({ ...prev, details: newDetails }));
    }, [setActiveOperation]);
    
    const setTanks = useCallback((updater: SetStateAction<Tank[]>) => {
        setActiveOperation(prev => {
            let newTanks: Tank[];
            if (typeof updater === 'function') {
                newTanks = updater(prev.tanks);
            } else {
                newTanks = updater;
            }
            return { ...prev, tanks: newTanks };
        });
    }, [setActiveOperation]);

    const setSignatures = useCallback((updater: SetStateAction<Signatures>) => {
        setActiveOperation(prev => {
            let finalSignatures: Signatures;
            if (typeof updater === 'function') {
                finalSignatures = updater(prev.signatures);
            } else {
                finalSignatures = updater;
            }
            return { ...prev, signatures: finalSignatures };
        });
    }, [setActiveOperation]);
    // --- End State Refactor ---

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [vessels, setVessels] = useLocalStorage<Vessel[]>('qc_vessels', []);
    const [tankWagons, setTankWagons] = useLocalStorage<TankWagon[]>('qc_tank_wagons', []);
    const [schedule, setSchedule] = useLocalStorage<VesselSchedule[]>('qc_vessel_schedule', []);
    const [locations, setLocations] = useLocalStorage<Location[]>('qc_locations', []);
    const [simpleAssets, setSimpleAssets] = useLocalStorage<SimpleAsset[]>('qc_simple_assets', []);
    const [selectedVesselId, setSelectedVesselId] = useState<number | 'new' | null>(null);
    const [selectedTankWagonId, setSelectedTankWagonId] = useState<number | 'new' | null>(null);
    const [activeScheduleId, setActiveScheduleId] = useLocalStorage<number | null>('qc_active_schedule_id', null);
    const [activeOperationType, setActiveOperationType] = useState<'loading' | 'unloading' | null>(null);
    
    const [navOrder, setNavOrder] = useLocalStorage<View[]>('qc_nav_order', ['planningHub', 'operationsHub', 'registrationHub', 'dashboard']);
    const [dashboardOrder, setDashboardOrder] = useLocalStorage<string[]>('qc_dashboard_order', ['certificates', 'schedule', 'loss', 'transit']);
    
    const prevVesselIdRef = useRef<number | null>(null);
    const prevScheduleIdRef = useRef<number | null>(null);

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark =
            theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', isDark);
        localStorage.setItem('qc_theme', theme);
    }, [theme]);

    const createManualTank = useCallback((): Tank => ({
        id: Date.now(),
        tipo: 'rodoviario',
        prod: 'anidro',
        ident: '',
        tanque: '',
        cliente: '',
        tdesc: '',
        ldesc: '',
        vamb: '',
        rho: '',
        Ta: '',
        Tt: '',
        lacres: [],
        isEmpty: false,
        results: { r20: NaN, fcv: NaN, inpm: NaN, v20: NaN, status: 'PENDING', messages: [] }
    }), []);

    const activeSchedule = useMemo(() => {
        return schedule.find(s => s.id === activeScheduleId) || null;
    }, [activeScheduleId, schedule]);

    useEffect(() => {
        if (activeView !== 'operation') return;

        const vesselIdChanged = prevVesselIdRef.current !== operationDetails.vesselId;
        const scheduleIdChanged = prevScheduleIdRef.current !== activeScheduleId;

        if (!vesselIdChanged && !scheduleIdChanged && tanks.length > 0) {
            return;
        }

        prevVesselIdRef.current = operationDetails.vesselId;
        prevScheduleIdRef.current = activeScheduleId;

        const selectedVessel = operationDetails.vesselId
            ? vessels.find(v => v.id === operationDetails.vesselId)
            : null;
        
        const productForTanks = activeSchedule?.product || 'anidro';

        if (selectedVessel) {
            const newTanks = selectedVessel.tanks.map((vesselTank): Tank => ({
                id: Date.now() + Math.random(),
                vesselTankId: vesselTank.id,
                tipo: 'fluvial',
                prod: productForTanks,
                ident: selectedVessel.name,
                tanque: vesselTank.tankName,
                cliente: activeSchedule?.client || '',
                tdesc: '',
                ldesc: '',
                vamb: '0',
                rho: '',
                Ta: '',
                Tt: '',
                trim: 0,
                alturaMedidaCm: '',
                lastroMm: '',
                dischargedVolume: '0',
                lacres: [],
                isEmpty: false,
                results: { r20: NaN, fcv: NaN, inpm: NaN, v20: NaN, status: 'PENDING', messages: [] }
            }));
            setTanks(newTanks);
        } else if (!activeScheduleId) {
            setTanks(prevTanks => {
                const isCurrentlyVesselMode = prevTanks.some(t => t.vesselTankId);
                if (prevTanks.length === 0 || isCurrentlyVesselMode || scheduleIdChanged) {
                    return [createManualTank()];
                }
                return prevTanks;
            });
        }
    }, [activeView, operationDetails.vesselId, vessels, createManualTank, setTanks, activeScheduleId, activeSchedule, tanks.length]);

    
    const handleNew = useCallback(() => {
        setActiveOperation(getInitialActiveOperation());
        setAnalysisResult('');
        setActiveScheduleId(null);
        setActiveOperationType(null);
    }, [setActiveOperation, setActiveScheduleId]);
    
    const handleEnterDashboard = () => {
        setActiveView('planningHub');
    };

    const handleLogout = () => {
        setActiveView('login');
    };
    
    const handleHome = () => {
        setActiveView('planningHub');
        setActiveOperation(getInitialActiveOperation());
        setAnalysisResult('');
        setActiveScheduleId(null);
        setActiveOperationType(null);
    };

    const handleStartOperationFromSchedule = useCallback((scheduleId: number) => {
        const scheduleToStart = schedule.find(s => s.id === scheduleId);
        const vesselForSchedule = vessels.find(v => v.name === scheduleToStart?.vesselName);

        if (scheduleToStart) {
            setSchedule(prev => prev.map(s => s.id === scheduleId ? { ...s, status: 'EM CARREGAMENTO' } : s));
            setActiveScheduleId(scheduleId);
            setActiveOperationType('loading');
            
            const newDetails: OperationDetails = {
                id: `OP-CARGA-${scheduleToStart.id}`,
                type: 'transferencia',
                modal: 'fluvial',
                vesselId: vesselForSchedule?.id || null,
                responsavel: operationDetails.responsavel,
                terminal: scheduleToStart.port,
                local: scheduleToStart.client,
                dateTime: nowLocal(),
                status: 'em_andamento',
            };
            
            setActiveOperation({
                details: newDetails,
                tanks: [],
                signatures: getInitialSignatures(),
            });
            setActiveView('operation');
        }
    }, [schedule, vessels, operationDetails.responsavel, setActiveOperation, setActiveScheduleId, setSchedule]);

    const handleArrivalRegistration = useCallback((scheduleId: number) => {
        setSchedule(prev => prev.map(s => 
            s.id === scheduleId 
                ? { ...s, status: 'AGUARDANDO DESCARGA', ata: s.ata || nowLocal() } 
                : s
        ));
    }, [setSchedule]);

    const handleStartDischargeOperation = useCallback((scheduleId: number) => {
        const scheduleToStart = schedule.find(s => s.id === scheduleId);
        const vesselForSchedule = vessels.find(v => v.name === scheduleToStart?.vesselName);

        if (scheduleToStart) {
            setSchedule(prev => prev.map(s => s.id === scheduleId ? { ...s, status: 'EM DESCARGA' } : s));
            setActiveScheduleId(scheduleId);
            setActiveOperationType('unloading');
            
            const newDetails: OperationDetails = {
                id: `OP-DESCARGA-${scheduleToStart.id}-${(scheduleToStart.discharges?.length || 0) + 1}`,
                type: 'transferencia',
                modal: 'fluvial',
                vesselId: vesselForSchedule?.id || null,
                responsavel: operationDetails.responsavel,
                terminal: scheduleToStart.port,
                local: scheduleToStart.client,
                dateTime: nowLocal(),
                status: 'em_andamento',
            };
            
            setActiveOperation({
                details: newDetails,
                tanks: [], // Reset tanks for discharge measurement
                signatures: getInitialSignatures(),
            });
            setActiveView('operation');
        }
    }, [schedule, vessels, operationDetails.responsavel, setActiveOperation, setActiveScheduleId, setSchedule]);

    const handleFinalizeTrip = useCallback((scheduleId: number) => {
        setSchedule(prev => prev.map(s => {
            if (s.id !== scheduleId) return s;

            const totalLoaded = brToNumber(s.loadedVolume || '0');
            const totalDischarged = s.discharges?.reduce((sum, d) => sum + d.totalDischargedVolume, 0) || 0;
            const finalLossGain = totalDischarged - totalLoaded;

            return { ...s, status: 'CONCLUÍDO', finalLossGain };
        }));
    }, [setSchedule]);


    const handleViewOperation = useCallback((scheduleId: number) => {
        const scheduleToView = schedule.find(s => s.id === scheduleId);
        if (!scheduleToView) return;
        
        setActiveScheduleId(scheduleId);
        if(scheduleToView.status === 'EM CARREGAMENTO') {
            setActiveOperationType('loading');
        } else if (scheduleToView.status === 'EM DESCARGA') {
            setActiveOperationType('unloading');
        }
        setActiveView('operation');
    }, [schedule, setActiveScheduleId, setActiveView]);
    
    const handleNewManualOperation = useCallback(() => {
        handleNew();
        setActiveView('operation');
    }, [handleNew, setActiveView]);

    
    const updateActiveSchedule = useCallback((updatedSchedule: VesselSchedule) => {
        if (!activeScheduleId) return;
        setSchedule(prev => prev.map(s => s.id === activeScheduleId ? updatedSchedule : s));
    }, [activeScheduleId, setSchedule]);


    const addTank = useCallback(() => {
        if (operationDetails.vesselId) return;
        setTanks(prev => [...prev, createManualTank()]);
    }, [operationDetails.vesselId, createManualTank, setTanks]);
    
    const updateTank = useCallback((id: number, updatedTank: Tank) => {
        let tankWithCalculatedVamb = { ...updatedTank };

        if (updatedTank.vesselTankId && updatedTank.trim !== undefined && !updatedTank.isEmpty) {
            const vessel = vessels.find(v => v.id === operationDetails.vesselId);
            const vesselTank = vessel?.tanks.find(t => t.id === updatedTank.vesselTankId);

            if (vesselTank) {
                const pointsForTrim = vesselTank.calibrationCurve
                    .filter(p => p.trim === updatedTank.trim)
                    .map(p => ({ height: p.height, volume: p.volume }));

                const totalHeightNum = brToNumber(updatedTank.alturaMedidaCm || '');
                const lastroHeightCm = brToNumber(updatedTank.lastroMm || '') / 10;

                const totalVolume = interpolate(totalHeightNum, pointsForTrim);
                const lastroVolume = interpolate(lastroHeightCm, pointsForTrim);

                const netVolume = (isFinite(totalVolume) ? totalVolume : 0) - (isFinite(lastroVolume) ? lastroVolume : 0);
                
                tankWithCalculatedVamb.vamb = isFinite(netVolume) && netVolume > 0 ? numberToBr(netVolume, 1) : '0';
            }
        }
        
        const reCalculatedTank = calculateTankMetrics(tankWithCalculatedVamb);
        setTanks(prev => prev.map(t => t.id === id ? reCalculatedTank : t));
    }, [vessels, operationDetails.vesselId, setTanks]);

    const deleteTank = useCallback((id: number) => {
        setTanks(prev => prev.filter(t => t.id !== id));
    }, [setTanks]);
    
    const duplicateTank = useCallback((id: number) => {
        if (operationDetails.vesselId) return;
        const tankToDuplicate = tanks.find(t => t.id === id);
        if (tankToDuplicate) {
            const newTank = { ...tankToDuplicate, id: Date.now() };
            setTanks(prev => [...prev, newTank]);
        }
    }, [tanks, operationDetails.vesselId, setTanks]);

    const calculateAll = useCallback(() => {
        setTanks(prev => prev.map(calculateTankMetrics));
    }, [setTanks]);

    const handleAIAnalysis = async (prompt: string) => {
        setIsAnalyzing(true);
        setAnalysisResult('');
        try {
            const result = await analyzeOperationData(operationDetails, tanks, prompt, vessels);
            setAnalysisResult(result);
        } catch (error) {
            console.error("AI Analysis Error:", error);
            setAnalysisResult("Ocorreu um erro ao analisar os dados. Verifique o console para mais detalhes.");
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const saveProject = () => {
        const projectData = { ...activeOperation };
        const json = JSON.stringify(projectData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${operationDetails.id || 'projeto'}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const loadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    if (data.details && data.tanks && data.signatures) {
                        setActiveOperation({
                            details: data.details,
                            tanks: data.tanks.map((t: Tank) => calculateTankMetrics(t)),
                            signatures: data.signatures
                        });
                        setActiveView('operation');
                        setActiveScheduleId(null);
                        setActiveOperationType(null);
                    } else {
                        alert("Arquivo de projeto inválido.");
                    }
                } catch (error) {
                    alert("Erro ao ler o arquivo de projeto.");
                }
            };
            reader.readAsText(file);
        }
    };

    const generateReport = () => {
        const reportHtml = generateReportHtml(operationDetails, tanks, signatures, vessels);
        const reportWindow = window.open('', '_blank');
        reportWindow?.document.write(reportHtml);
        reportWindow?.document.close();
    };

    const handleGenerateReportFromSchedule = useCallback((scheduleId: number) => {
        const loadingOpId = `OP-CARGA-${scheduleId}`;
        let operationToReport: ActiveOperationState | undefined;

        if (activeOperation.details.id === loadingOpId) {
            operationToReport = activeOperation;
        } else {
            operationToReport = archivedOperations.find(op => op.details.id === loadingOpId);
        }
        
        if (operationToReport) {
            const { details, tanks, signatures } = operationToReport;
            const reportHtml = generateReportHtml(details, tanks, signatures, vessels);
            const reportWindow = window.open('', '_blank');
            reportWindow?.document.write(reportHtml);
            reportWindow?.document.close();
        } else {
            alert(`Operação de carregamento para a programação ${scheduleId} não encontrada.`);
        }
    }, [activeOperation, archivedOperations, vessels]);

    const handleConcludeOperation = () => {
        const concludedOperation: ActiveOperationState = {
            ...activeOperation,
            details: { ...activeOperation.details, status: 'concluida' }
        };
        setArchivedOperations(prev => [concludedOperation, ...prev]);

        if (activeScheduleId && activeSchedule) {
            if (activeOperationType === 'loading') {
                const totalLoadedVolume = tanks.reduce((sum, t) => sum + (isFinite(t.results.v20) ? t.results.v20 : 0), 0);
                setSchedule(prev => prev.map(s => 
                    s.id === activeScheduleId 
                        ? { ...s, status: 'EM TRÂNSITO', loadedVolume: String(Math.round(totalLoadedVolume)) } 
                        : s
                ));
            } else if (activeOperationType === 'unloading') {
                const totalDischargedVolume = tanks.reduce((sum, t) => sum + brToNumber(t.dischargedVolume || '0'), 0);
                const dischargeMeasurements: DischargeTankMeasurement[] = tanks
                    .filter(t => brToNumber(t.dischargedVolume || '0') > 0)
                    .map(t => ({
                        vesselTankId: t.vesselTankId!,
                        tankName: t.tanque,
                        dischargedVolume: brToNumber(t.dischargedVolume || '0'),
                    }));
                
                const newDischargeEvent: DischargeEvent = {
                    id: operationDetails.id,
                    dateTime: operationDetails.dateTime,
                    totalDischargedVolume: totalDischargedVolume,
                    measurements: dischargeMeasurements
                };

                setSchedule(prev => prev.map(s => 
                    s.id === activeScheduleId 
                        ? { ...s, status: 'AGUARDANDO DESCARGA', discharges: [...(s.discharges || []), newDischargeEvent] } 
                        : s
                ));
            }
        }

        handleNew();
        setActiveView('operationsHub');
    };
    
    const handleBackToRegistrationHub = () => {
        setActiveView('registrationHub');
        setSelectedVesselId(null);
        setSelectedTankWagonId(null);
    };

    const handleEditVessel = (vesselId: number | 'new') => {
        setSelectedVesselId(vesselId);
        setActiveView('vesselDetail');
    };

    const handleDeleteVessel = (vesselId: number) => {
        setVessels(prev => prev.filter(v => v.id !== vesselId));
    };

    const handleSaveVessel = (vesselToSave: Vessel) => {
        const vesselExists = vessels.some(v => v.id === vesselToSave.id);
        if (vesselExists) {
            setVessels(prev => prev.map(v => (v.id === vesselToSave.id ? vesselToSave : v)));
        } else {
            setVessels(prev => [...prev, vesselToSave]);
        }
        handleBackToRegistrationHub();
    };
    
     const handleVesselTxtImport = (file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (!content) {
                alert("Arquivo vazio ou ilegível.");
                return;
            }
            try {
                setVessels(currentVessels => {
                    let updatedVessels = JSON.parse(JSON.stringify(currentVessels)); 

                    const records = content.split(/(?=BALSA;|TANQUE;|CALIBRACAO;)/g).filter(r => r.trim());

                    for (const record of records) {
                        const parts = record.split(';').map(p => p.trim());
                        const type = parts[0];

                        switch (type) {
                            case 'BALSA': {
                                const [, externalId, name, owner, issueDate, expiryDate, capacity, notes] = parts;
                                if (!externalId || !name) throw new Error(`Linha BALSA inválida: ${record}`);

                                let vessel = updatedVessels.find((v: Vessel) => v.externalId === externalId);
                                if (vessel) { // Update
                                    vessel.name = name;
                                    vessel.owner = owner;
                                    vessel.issueDate = issueDate;
                                    vessel.expiryDate = expiryDate;
                                    vessel.totalTheoreticalCapacity = parseInt(capacity, 10) || vessel.totalTheoreticalCapacity;
                                    vessel.notes = notes || vessel.notes;
                                } else { // Create
                                    updatedVessels.push({
                                        id: Date.now() + Math.random(), externalId, name, owner, issueDate, expiryDate,
                                        totalTheoreticalCapacity: parseInt(capacity, 10) || 0,
                                        notes: notes || '', type: 'balsa-tanque', certificateNumber: '', executor: '', tanks: []
                                    });
                                }
                                break;
                            }
                            case 'TANQUE': {
                                const [, balsaId, tankId, tankName, maxHeight, maxVolume] = parts;
                                if (!balsaId || !tankId || !tankName) throw new Error(`Linha TANQUE inválida: ${record}`);
                                
                                const vessel = updatedVessels.find((v: Vessel) => v.externalId === balsaId);
                                if (!vessel) throw new Error(`Balsa com ID ${balsaId} não encontrada para o tanque ${tankId}.`);
                                
                                let tank = vessel.tanks.find((t: VesselTank) => t.externalId === tankId);
                                if (tank) { // Update tank
                                    tank.tankName = tankName;
                                    tank.maxCalibratedHeight = parseInt(maxHeight, 10) || tank.maxCalibratedHeight;
                                    tank.maxVolume = parseInt(maxVolume, 10) || tank.maxVolume;
                                } else { // Create tank
                                    vessel.tanks.push({
                                        id: Date.now() + Math.random(), externalId: tankId, tankName,
                                        maxCalibratedHeight: parseInt(maxHeight, 10) || 0,
                                        maxVolume: parseInt(maxVolume, 10) || 0,
                                        calibrationCurve: []
                                    });
                                }
                                break;
                            }
                            case 'CALIBRACAO': {
                                const [, tankId, trimStr, heightStr, volumeStr] = parts;
                                if (!tankId) throw new Error(`Linha CALIBRACAO inválida: ${record}`);
                                
                                let foundTank: VesselTank | undefined;
                                for (const vessel of updatedVessels) {
                                    const tank = vessel.tanks.find((t: VesselTank) => t.externalId === tankId);
                                    if (tank) {
                                        foundTank = tank;
                                        break;
                                    }
                                }
                                if (!foundTank) throw new Error(`Tanque com ID ${tankId} não encontrado para calibração.`);

                                const trim = parseInt(trimStr.replace('+', ''), 10);
                                const height = parseFloat(heightStr.replace(',', '.'));
                                const volume = parseInt(volumeStr, 10);
                                if (!isNaN(trim) && !isNaN(height) && !isNaN(volume)) {
                                    const pointExists = foundTank.calibrationCurve.some(p => p.trim === trim && p.height === height);
                                    if (!pointExists) {
                                       foundTank.calibrationCurve.push({ trim, height, volume });
                                    }
                                }
                                break;
                            }
                        }
                    }
                    return updatedVessels;
                });
                alert("Importação de embarcações concluída com sucesso!");
            } catch (error) {
                console.error("Erro na importação de embarcações:", error);
                alert(`Ocorreu um erro durante a importação: ${(error as Error).message}`);
            }
        };
        reader.readAsText(file);
    };


    const handleEditTankWagon = (tankWagonId: number | 'new') => {
        setSelectedTankWagonId(tankWagonId);
        setActiveView('tankWagonDetail');
    };

    const handleDeleteTankWagon = (tankWagonId: number) => {
        setTankWagons(prev => prev.filter(tw => tw.id !== tankWagonId));
    };

    const handleSaveTankWagon = (wagonToSave: TankWagon) => {
        const wagonExists = tankWagons.some(tw => tw.id === wagonToSave.id);
        if (wagonExists) {
            setTankWagons(prev => prev.map(tw => (tw.id === wagonToSave.id ? wagonToSave : tw)));
        } else {
            setTankWagons(prev => [...prev, wagonToSave]);
        }
        handleBackToRegistrationHub();
    };
    
    const handleNavigateToTankWagonImport = () => {
        setActiveView('tankWagonImport');
    };

    const handleSaveImportedTankWagons = (wagonsToUpsert: TankWagon[]) => {
        setTankWagons(prevWagons => {
            const wagonMap = new Map(prevWagons.map(w => [w.name, w]));
            wagonsToUpsert.forEach(newWagon => {
                const existing = prevWagons.find(w => w.name === newWagon.name);
                if (existing) {
                    newWagon.id = existing.id; // Preserve ID on update
                }
                wagonMap.set(newWagon.name, newWagon);
            });
            return Array.from(wagonMap.values());
        });
        setActiveView('registrationHub');
    };

    const handleDataReset = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    };

    const handleBackupData = () => {
        const backupData: { [key: string]: any } = {};
        LOCAL_STORAGE_KEYS.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                backupData[key] = JSON.parse(data);
            }
        });
        const json = JSON.stringify(backupData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `backup_bluemultimodal_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRestoreData = async (file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                let valid = true;
                // Simple validation: check if at least one expected key exists
                if (typeof data !== 'object' || !LOCAL_STORAGE_KEYS.some(key => key in data)) {
                    valid = false;
                }
                
                if (valid) {
                    Object.keys(data).forEach(key => {
                        if (LOCAL_STORAGE_KEYS.includes(key)) {
                            localStorage.setItem(key, JSON.stringify(data[key]));
                        }
                    });
                    alert("Backup restaurado com sucesso! A aplicação será recarregada.");
                    window.location.reload();
                } else {
                    alert("Arquivo de backup inválido.");
                }
            } catch (error) {
                alert("Erro ao ler o arquivo de backup.");
            }
        };
        reader.readAsText(file);
    };


    const renderContent = () => {
        switch (activeView) {
            case 'planningHub':
                return <PlanningHubScreen onSelectModal={(modal) => {
                    if (modal === 'fluvial') setActiveView('operationsHub');
                }} />;
            case 'operationsHub':
                return <OperationsHubScreen 
                            schedule={schedule}
                            onStartOperation={handleStartOperationFromSchedule}
                            onRegisterArrival={handleArrivalRegistration}
                            onStartDischarge={handleStartDischargeOperation}
                            onViewOperation={handleViewOperation}
                            onNewOperation={handleNewManualOperation}
                            onFinalizeTrip={handleFinalizeTrip}
                            onGenerateReport={handleGenerateReportFromSchedule}
                        />;
            case 'registrationHub':
                 return <RegistrationHubScreen 
                            locations={locations}
                            setLocations={setLocations}
                            simpleAssets={simpleAssets}
                            setSimpleAssets={setSimpleAssets}
                            vessels={vessels}
                            onEditVessel={handleEditVessel}
                            onDeleteVessel={handleDeleteVessel}
                            onImportVessel={handleVesselTxtImport}
                            tankWagons={tankWagons}
                            onEditTankWagon={handleEditTankWagon}
                            onDeleteTankWagon={handleDeleteTankWagon}
                            onImportTankWagon={handleNavigateToTankWagonImport}
                        />;
            case 'operation':
                return (
                    <OperationScreen
                        operationDetails={operationDetails}
                        setOperationDetails={setOperationDetails}
                        tanks={tanks}
                        vessels={vessels}
                        signatures={signatures}
                        setSignatures={setSignatures}
                        analysisResult={analysisResult}
                        isAnalyzing={isAnalyzing}
                        onAddTank={addTank}
                        onUpdateTank={updateTank}
                        onDeleteTank={deleteTank}
                        onDuplicateTank={duplicateTank}
                        onCalcAll={calculateAll}
                        onAIAnalysis={handleAIAnalysis}
                        onSave={saveProject}
                        onLoad={loadProject}
                        onNew={handleNewManualOperation}
                        onExport={() => exportToCsv(operationDetails, tanks, vessels)}
                        onReport={generateReport}
                        onConclude={handleConcludeOperation}
                        activeSchedule={activeSchedule}
                        onUpdateSchedule={updateActiveSchedule}
                        activeOperationType={activeOperationType}
                    />
                );
            case 'dashboard':
                return <DashboardScreen 
                    vessels={vessels} 
                    schedule={schedule}
                    dashboardOrder={dashboardOrder}
                    setDashboardOrder={setDashboardOrder}
                />;
            case 'settings':
                return (
                    <main className="max-w-8xl mx-auto p-4 md:p-8">
                        <SettingsScreen 
                            onReset={handleDataReset} 
                            onBackup={handleBackupData}
                            onRestore={handleRestoreData}
                        />
                    </main>
                );
            case 'vesselDetail':
                const vessel = selectedVesselId === 'new' ? undefined : vessels.find(v => v.id === selectedVesselId);
                if (selectedVesselId !== 'new' && !vessel) {
                    setActiveView('registrationHub');
                    return null;
                }
                const breadcrumbItemsVessel = [
                    { label: 'Central de Cadastros', onClick: handleBackToRegistrationHub },
                    { label: vessel ? vessel.name : 'Nova Embarcação' }
                ];
                return (
                    <main className="max-w-8xl mx-auto p-4 md:p-8">
                        <Breadcrumb items={breadcrumbItemsVessel} />
                        <VesselScreen 
                            key={String(selectedVesselId)}
                            vessel={vessel} 
                            onSave={handleSaveVessel} 
                            onBack={handleBackToRegistrationHub} 
                        />
                    </main>
                );
            case 'tankWagonDetail':
                const tankWagon = selectedTankWagonId === 'new' ? undefined : tankWagons.find(tw => tw.id === selectedTankWagonId);
                 if (selectedTankWagonId !== 'new' && !tankWagon) {
                    setActiveView('registrationHub');
                    return null;
                }
                const breadcrumbItemsWagon = [
                    { label: 'Central de Cadastros', onClick: handleBackToRegistrationHub },
                    { label: tankWagon ? tankWagon.name : 'Novo Vagão-Tanque' }
                ];
                 return (
                    <main className="max-w-8xl mx-auto p-4 md:p-8">
                         <Breadcrumb items={breadcrumbItemsWagon} />
                         <TankWagonScreen
                            key={String(selectedTankWagonId)}
                            tankWagon={tankWagon}
                            onSave={handleSaveTankWagon}
                            onBack={handleBackToRegistrationHub}
                         />
                    </main>
                );
            case 'tankWagonImport':
                return (
                    <main className="max-w-8xl mx-auto p-4 md:p-8">
                        <Breadcrumb items={[
                            { label: 'Central de Cadastros', onClick: handleBackToRegistrationHub },
                            { label: 'Importar Certificado de Vagão-Tanque' }
                        ]} />
                        <TankWagonImportScreen
                            existingTankWagons={tankWagons}
                            onSave={handleSaveImportedTankWagons}
                            onBack={handleBackToRegistrationHub}
                        />
                    </main>
                );
            default:
                 return <PlanningHubScreen onSelectModal={(modal) => {
                    if (modal === 'fluvial') setActiveView('operationsHub');
                }} />;
        }
    };
    
    if (activeView === 'login') {
        return <LoginScreen onEnter={handleEnterDashboard} />;
    }

    const currentActiveView = () => {
        if (activeView === 'vesselDetail' || activeView === 'tankWagonDetail' || activeView === 'tankWagonImport') return 'registrationHub';
        if (activeView === 'operation' && activeScheduleId) return 'operationsHub';
        if (activeView === 'operation' && !activeScheduleId) return 'operationsHub';
        return activeView;
    }

    return (
        <div className="min-h-screen bg-background">
            <Header 
                onHome={handleHome} 
                theme={theme} 
                setTheme={setTheme} 
                setView={setActiveView} 
                activeView={currentActiveView()}
                navOrder={navOrder}
                setNavOrder={setNavOrder}
                onLogout={handleLogout}
            />
            
            <div className="pl-20">
                {renderContent()}
            </div>
        </div>
    );
};

export default App;