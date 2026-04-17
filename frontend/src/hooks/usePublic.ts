import { useFetch } from "./useFetch";

export type PublicCourse = {
  id: string;
  name: string;
  holes: number;
  par: number;
  description: string;
  price_per_person: number;
  difficulty: string;
};

export type PublicRoom = {
  id: string;
  building: string;
  room_type: string;
  capacity: number;
  base_price: number;
  description: string;
};

export type PublicPackage = {
  id: string;
  name: string;
  description: string;
  base_price: number;
  components: unknown;
  target_segment: string | null;
};

export type AvailableSlot = {
  id: string;
  course_id: string;
  tee_time: string;
  party_size: number;
};

export function usePublicCourses() {
  return useFetch<PublicCourse[]>("/public/golf/courses");
}

export function usePublicRooms() {
  return useFetch<PublicRoom[]>("/public/rooms");
}

export function usePublicPackages() {
  return useFetch<PublicPackage[]>("/public/packages");
}

export function useAvailableSlots(date: string, courseId?: string) {
  return useFetch<AvailableSlot[]>("/public/golf/available-slots", {
    tee_date: date,
    ...(courseId ? { course_id: courseId } : {}),
  });
}
