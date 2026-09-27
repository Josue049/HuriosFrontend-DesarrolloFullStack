import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from "react";

import {
    vehicleService,
} from "../services/vehicleService";

import type {
    CreateVehicleRequest,
    Vehicle,
} from "../types/vehicle";

type VehicleContextType = {
    vehicles: Vehicle[];
    loading: boolean;
    error: string | null;
    loadVehicles: () => Promise<void>;
    addVehicle: (vehicle: CreateVehicleRequest) => Promise<Vehicle>;
};

const VehicleContext = createContext<VehicleContextType | undefined>(
    undefined,
);

type VehicleProviderProps = {
    children: ReactNode;
};