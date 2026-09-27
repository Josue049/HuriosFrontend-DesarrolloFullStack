import { apiClient } from "../api/client";
import type { CreateVehicleRequest, Vehicle } from "../types/vehicle";

const VEHICLES_ENDPOINT = "/vehicles";

export function getVehicles(): Promise<Vehicle[]> {
  return apiClient.get<Vehicle[]>(VEHICLES_ENDPOINT);
}

export function createVehicle(vehicle: CreateVehicleRequest): Promise<Vehicle> {
  return apiClient.post<Vehicle, CreateVehicleRequest>(VEHICLES_ENDPOINT, vehicle);
}

export const vehicleService = {
  getAll: getVehicles,
  create: createVehicle,
};
