import { useFetch } from "./useFetch";
import type { RoomResponse, ReservationResponse } from "@/lib/types";

export function useRooms(building?: string) {
  return useFetch<RoomResponse[]>("/resort/rooms", building ? { building } : {});
}

export function useReservations(checkIn?: string, status?: string) {
  return useFetch<ReservationResponse[]>("/resort/reservations", {
    ...(checkIn ? { check_in: checkIn } : {}),
    ...(status ? { status } : {}),
  });
}
