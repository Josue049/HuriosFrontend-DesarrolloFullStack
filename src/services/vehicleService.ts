import { apiClient } from "../api/client";
import type { Vehicle } from "../types/vehicle";

const VEHICLES_ENDPOINT = "/vehicles";

export function getVehicles(): Promise<Vehicle[]> {
  return apiClient.get<Vehicle[]>(VEHICLES_ENDPOINT);
}

export const vehicleService = {
  getAll: getVehicles,
};
