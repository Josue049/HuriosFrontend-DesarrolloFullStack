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

export function VehicleProvider({
                                    children,
                                }: VehicleProviderProps) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadVehicles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await vehicleService.getAll();

            setVehicles(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron cargar los vehículos.",
            );
        } finally {
            setLoading(false);
        }
    }, []);
}