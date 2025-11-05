export type ProductType = 'anidro' | 'hidratado' | 'granel';
export type ModalType = 'rodoviario' | 'fluvial' | 'ferroviario' | 'terra' | 'maritimo' | 'aereo' | 'dutoviario';
export type OperationType = 'recebimento' | 'expedicao' | 'transferencia';
export type Theme = 'light' | 'dark' | 'system';
export type View = 'login' | 'operation' | 'operationsHub' | 'dashboard' | 'vesselDetail' | 'planningHub' | 'registrationHub' | 'tankWagonDetail' | 'tankWagonImport' | 'settings';
export type OperationStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type Incoterm = 'EXW' | 'FOB' | 'CIF' | 'DDP' | 'DAP' | 'CPT';

export interface TankResults {
    r20: number;
    fcv: number;
    inpm: number;
    v20: number;
    status: 'OK' | 'FORA' | 'PENDING';
    messages: string[];
}

export interface Tank {
    id: number;
    vesselTankId?: number; // Link to VesselTank
    tipo: ModalType;
    prod: ProductType;
    ident: string; // Vessel name or Plate
    tanque: string; // Tank name or number
    cliente: string;
    tdesc: string;
    ldesc: string;
    vamb: string;
    rho: string;
    Ta: string;
    Tt: string;
    trim?: number;
    alturaMedidaCm?: string;
    lastroMm?: string;
    dischargedVolume?: string; // Volume input for discharge operations
    lacres: string[];
    isEmpty?: boolean;
    results: TankResults;
}

export interface OperationDetails {
    id: string;
    type: OperationType;
    modal: ModalType;
    vesselId: number | null; // Replaces 'balsa'
    responsavel: string;
    terminal: string;
    local: string;
    dateTime: string;
    status: OperationStatus;
}

export interface Signatures {
    transportador: string | null;
    certificadora: string | null;
    representante: string | null;
}

// New types for the detailed vessel scheduling screen
export type VesselOpType = 'Balsa' | 'Navio';
export type VesselPerformanceStatus = 'NO PRAZO' | 'ATRASADO' | 'ADIANTADO';
export type VesselScheduleLifecycleStatus = 'PLANEJADO' | 'EM CARREGAMENTO' | 'EM TRÂNSITO' | 'AGUARDANDO DESCARGA' | 'EM DESCARGA' | 'CONCLUÍDO';


export interface ScheduledTankInOp {
    id: string; // unique id for the list
    tankName: string; // ex: TQ-01, TQ-02...
    product: ProductType;
    volumeAmbient: string;
    volume20c: string;
    inpm: string;
    seals: string[];
}

export interface DischargeTankMeasurement {
    vesselTankId: number;
    tankName: string;
    dischargedVolume: number;
}

export interface DischargeEvent {
    id: string; // Corresponds to the operation ID
    dateTime: string;
    totalDischargedVolume: number;
    measurements: DischargeTankMeasurement[];
}

export interface VesselSchedule {
    id: number;
    status: VesselScheduleLifecycleStatus;
    product: ProductType;
    orders?: string[];
    incoterm?: Incoterm;

    // Identificação
    vesselType: VesselOpType;
    vesselName: string;
    port: string;
    client: string;

    // Previsão (Planejado)
    eta?: string; // date-time string
    etb?: string;
    etcStart?: string;
    etcEnd?: string;
    etd?: string;
    plannedVolume?: string; // number as string
    plannedTransitTimeDays?: string; // number as string

    // Realizado (Fato)
    ata?: string;
    atb?: string;
    ats?: string;
    atcFinish?: string;
    atd?: string;
    loadedVolume?: string; // number as string
    discharges?: DischargeEvent[];
    finalLossGain?: number;
    
    // Rastreabilidade e Ocorrências
    tanks: ScheduledTankInOp[];
    releaseDensity?: string;
    releaseInpm?: string;
    occurrences?: string;
}


// New refactored types for Equipment and Gauging to match detailed prompt
export type EquipmentType = 'balsa-tanque' | 'balsa-granel' | 'navio-tanque' | 'navio-granel';

export interface CalibrationPoint {
    height: number;
    trim: number; // e.g., -50, -25, 0, 25, 50
    volume: number;
}

export interface VesselTank {
    id: number;
    externalId?: string; // For ID_TANQUE
    tankName: string;
    maxCalibratedHeight?: number;
    maxVolume?: number;
    calibrationCurve: CalibrationPoint[];
    measurementHistory?: Array<{ date: string; measuredVolume: number }>;
}

export interface Vessel {
    id: number;
    externalId?: string; // For ID_BALSA
    type: EquipmentType;
    name: string;
    owner?: string;
    totalTheoreticalCapacity?: number;
    certificateNumber: string;
    issueDate: string; // Stored as 'YYYY-MM-DD'
    expiryDate: string; // Stored as 'YYYY-MM-DD'
    vettingExpiryDate?: string; // Stored as 'YYYY-MM-DD'
    executor: string;
    notes?: string; // For OBSERVACOES
    tanks: VesselTank[];
}

export type MeasurementOperationType = 'carregamento_inicial' | 'descarga_parcial' | 'descarga_final' | 'afericao_rotina';

export interface MeasurementLog {
    id: number;
    vesselId: number;
    dateTime: string;
    operationType: MeasurementOperationType;
    product: string;
    operator: string;
    totalVolume: number;
    origin?: string;
    destination?: string;
    measurements: Array<{
        tankId: number;
        tankName: string;
        trim: number;
        height: number;
        calculatedVolume: number;
    }>;
}

export interface ActiveOperationState {
    details: OperationDetails;
    tanks: Tank[];
    signatures: Signatures;
}

// --- New types for Registration Hub ---
export type LocationType = 'armazem-granel' | 'terminal-liquido' | 'recinto-alfandegado';
export type SimpleAssetType = 'tanque-terra' | 'vagao-tanque' | 'vagao-granel' | 'container';

export interface Location {
    id: number;
    type: LocationType;
    name: string;
    city: string;
    state: string;
}

export interface SimpleAsset {
    id: number;
    type: SimpleAssetType;
    name: string; // e.g., TQ-101, V-F-555
    capacity?: number;
    unit?: 'liters' | 'kg';
    locationId?: number; // Link to a Location
}

// --- New types for Tank Wagons ---
export interface TankWagonCalibrationPoint {
    emptySpaceMm: number;
    volumeL: number;
}

export interface TankWagon {
    id: number;
    name: string; // ID e.g. TCT 034.467-2 (WAGON_MODEL)
    inmetroNumber?: string;
    brand?: string;
    calibrationDate?: string; // YYYY-MM-DD
    certificateNumber?: string;
    validUntil?: string; // YYYY-MM-DD
    calibrationTable: TankWagonCalibrationPoint[];
}

// --- New Types for Tank Wagon CSV Import ---

export type CalibrationStep = {
    step: number;
    volume_L: number;
    ullage_mm: number;
};

export type CalibrationRow = {
  CERT_TYPE: string;
  CERT_NUMBER: string;
  ISSUER: string;
  ISSUE_DATE: string;       // YYYY-MM-DD
  VALID_UNTIL: string;      // YYYY-MM-DD
  DOC: string; EXE: string; METROL: string;
  STATUS: string;
  OWNER_NAME: string; OWNER_CNPJ: string;
  OWNER_STREET: string; OWNER_NUM: string; OWNER_DIST: string; OWNER_CITY: string; OWNER_STATE: string; OWNER_ZIP: string; OWNER_PHONE: string;
  WAGON_MFR: string; WAGON_MODEL: string; WAGON_YEAR: string; WAGON_SERIAL: string; INMETRO_ID: string; REGISTRATION: string;
  DIAMETER_MM: number; LENGTH_MM: number;
  DOMO_TYPE: string; DOMO_HREF_MM: number | "" | null;
  CAL_MEDIUM: string; REF_TEMP_C: number;
  ULLAGE_EMPTY_MM: number; ULLAGE_FULL_MM: number; ULLAGE_TOTAL_MM: number;
  NOMINAL_CAP_L: number;
  TANK_STEPS_JSON: string;  // JSON array of CalibrationStep
  DOMO_STEPS_JSON: string;  // JSON array of CalibrationStep
  LAB_NAME: string; RBC_CODE: string; TECHNICIAN: string; RESP_TECH: string; SIGN_DATE: string; OBS: string;
};

export interface ValidationError {
    line: number;
    field: keyof CalibrationRow | 'general';
    message: string;
    severity: 'error' | 'warning';
}

export interface ImportReport {
    filename: string;
    totalRows: number;
    imported: number;
    skipped: number;
    errors: ValidationError[];
    warnings: ValidationError[];
}