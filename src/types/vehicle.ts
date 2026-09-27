export type VehicleId = number | string;

/**
 * Contrato mínimo de un vehículo devuelto por el backend.
 * Los campos adicionales se conservan para no acoplar el cliente a una
 * implementación concreta del DTO del backend.
 */
export type Vehicle = {
  id?: VehicleId;
  [key: string]: unknown;
};

/**
 * Payload para POST /vehicles.
 * Se deja abierto a los campos definidos por el DTO del backend.
 */
export type CreateVehicleRequest = Record<string, unknown>;
