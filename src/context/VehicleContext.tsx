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