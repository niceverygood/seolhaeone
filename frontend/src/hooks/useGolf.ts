import { useFetch } from "./useFetch";
import type { GolfCourse, TeetimeResponse } from "@/lib/types";

export function useCourses() {
  return useFetch<GolfCourse[]>("/golf/courses");
}

export function useTeetimes(date: string, courseId?: string) {
  return useFetch<TeetimeResponse[]>("/golf/teetimes", {
    date,
    ...(courseId ? { course_id: courseId } : {}),
  });
}
