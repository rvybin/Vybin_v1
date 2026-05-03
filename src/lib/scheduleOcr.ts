import { supabase } from "./supabase";

export type ParsedClass = {
  day: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
  title: string;
  course_code: string;
  location?: string | null;
  startTime: string;
  endTime: string;
  notes?: string | null;
};

export async function parseScheduleFromStorage(storagePath: string): Promise<ParsedClass[]> {
  const { data, error } = await supabase.functions.invoke("parse-schedule", {
    body: { storagePath },
  });

  if (error) throw new Error(error.message ?? "Schedule parsing failed");
  if (!Array.isArray(data)) throw new Error("Unexpected response from schedule parser");

  return data as ParsedClass[];
}
