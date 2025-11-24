// Copilot, reescribe por completo este archivo jobService.ts para alinearlo con el esquema REAL
// de la base de datos de UPICONNECT.
//
// Esquema de la tabla "jobs" (ya creada en Supabase):
//  - id serial primary key
//  - recruiter_id uuid references recruiters(id)
//  - title text not null
//  - position text not null
//  - description text
//  - degree_required text
//  - salary numeric(10,2)
//  - available_slots int default 1
//  - status text default 'ABIERTA'
//  - created_at timestamptz default now()
//
// Esquema de la tabla "applications":
//  - id serial primary key
//  - job_id int references jobs(id)
//  - student_id uuid references students(id)
//  - status text default 'POSTULADO'
//  - applied_at timestamptz default now()
//  - unique (job_id, student_id)
//
// NO uses columnas como company_id, salary_range, location, etc. porque NO existen en nuestra BD.
//
// Debes crear y exportar exactamente estas funciones:
//
// 1) createJob(input: CreateJobInput)
//    - Inserta un nuevo registro en "jobs" con:
//        recruiter_id, title, position, description, degree_required, salary, available_slots
//    - available_slots debe usar 1 si no viene en input.
//    - Usa supabase.from("jobs").insert(...).select("*").single() para regresar el job creado.
//    - Si Supabase devuelve error, lanza: new Error("JOB_CREATE_ERROR: " + error.message)
//
// 2) updateJobAvailability(jobId: number, availableSlots: number)
//    - Hace update en "jobs" seteando available_slots = availableSlots donde id = jobId.
//    - Si hay error, lanza: new Error("JOB_AVAILABILITY_ERROR: " + error.message)
//
// 3) applyToJob(jobId: number, studentId: string)
//    - Inserta en "applications": { job_id: jobId, student_id: studentId }.
//    - Como la tabla tiene unique(job_id, student_id), si el alumno se postula dos veces
//      al mismo empleo, Supabase devolerá un error de constraint.
//    - En caso de error, lanza: new Error("JOB_APPLICATION_ERROR: " + error.message)
//
// 4) setApplicationStatus(applicationId: number, status: "ACEPTADO" | "RECHAZADO")
//    - Hace update en "applications" seteando status = status donde id = applicationId.
//    - Si hay error, lanza: new Error("APPLICATION_STATUS_ERROR: " + error.message)
//
// Usa el cliente Supabase desde "@/lib/supabaseClient" y types de TypeScript simples.
// NO declares ni uses campos que no existan en las tablas definidas arriba.

import { supabase } from "@/lib/supabaseClient";

export type CreateJobInput = {
  recruiterId: string;
  title: string;
  position: string;
  description?: string;
  degreeRequired?: string;
  salary?: number;
  availableSlots?: number;
};

// Aquí abajo implementa las funciones solicitadas usando el esquema correcto de BD.

/**
 * createJob
 * ---------
 * Crea un nuevo registro en la tabla `jobs` usando el esquema real de la BD.
 *
 * Contrato:
 * - Entrada: {@link CreateJobInput}
 * - Salida: Promise<any> — el objeto de job creado (resultado de `.select("*").single()`).
 * - Errores: lanza `new Error("JOB_CREATE_ERROR: " + error.message)` cuando Supabase devuelve error.
 *
 * Notas para pruebas:
 * - En tests unitarios, mockear `supabase.from('jobs').insert(...).select(...).single()` y
 *   simular tanto el camino feliz como el error para verificar el prefijo del error.
 */
export async function createJob(input: CreateJobInput) {
  const {
    recruiterId,
    title,
    position,
    description,
    degreeRequired,
    salary,
    availableSlots,
  } = input;

  const payload = {
    recruiter_id: recruiterId,
    title,
    position,
    description: description ?? null,
    degree_required: degreeRequired ?? null,
    salary: salary ?? null,
    available_slots: availableSlots ?? 1,
  };

  try {
    const { data, error } = await supabase.from('jobs').insert(payload).select('*').single();
    if (error) {
      throw new Error('JOB_CREATE_ERROR: ' + error.message);
    }
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error('JOB_CREATE_ERROR: ' + message);
  }
}

/**
 * updateJobAvailability
 * ---------------------
 * Actualiza el número de `available_slots` de un job existente.
 *
 * Contrato:
 * - Entrada: jobId (number), availableSlots (number)
 * - Salida: Promise<void>
 * - Errores: lanza `new Error("JOB_AVAILABILITY_ERROR: " + error.message)` en caso de fallo.
 */
export async function updateJobAvailability(jobId: number, availableSlots: number) {
  try {
    const { error } = await supabase.from('jobs').update({ available_slots: availableSlots }).eq('id', jobId);
    if (error) throw new Error('JOB_AVAILABILITY_ERROR: ' + error.message);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error('JOB_AVAILABILITY_ERROR: ' + message);
  }
}

/**
 * applyToJob
 * ----------
 * Inserta una postulación del alumno a una oferta (tabla `applications`).
 *
 * Contrato:
 * - Entrada: jobId (number), studentId (string)
 * - Salida: Promise<any> — resultado de la inserción (puede ser el objeto application).
 * - Errores: lanza `new Error("JOB_APPLICATION_ERROR: " + error.message)` en caso de fallo
 *   (por ejemplo, violación de unique(job_id, student_id)).
 */
export async function applyToJob(jobId: number, studentId: string) {
  try {
    const { data, error } = await supabase.from('applications').insert({ job_id: jobId, student_id: studentId }).select('*').single();
    if (error) throw new Error('JOB_APPLICATION_ERROR: ' + error.message);
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error('JOB_APPLICATION_ERROR: ' + message);
  }
}

/**
 * setApplicationStatus
 * --------------------
 * Actualiza el estado de una aplicación (ACEPTADO | RECHAZADO).
 *
 * Contrato:
 * - Entrada: applicationId (number), status ("ACEPTADO" | "RECHAZADO")
 * - Salida: Promise<void>
 * - Errores: lanza `new Error("APPLICATION_STATUS_ERROR: " + error.message)` en caso de fallo.
 */
export async function setApplicationStatus(applicationId: number, status: 'ACEPTADO' | 'RECHAZADO') {
  try {
    const { error } = await supabase.from('applications').update({ status }).eq('id', applicationId);
    if (error) throw new Error('APPLICATION_STATUS_ERROR: ' + error.message);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error('APPLICATION_STATUS_ERROR: ' + message);
  }
}
