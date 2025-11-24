// Servicio de dominio para gestionar alumnos de la plataforma UPICONNECT.
//
// Requisitos y estilo:
// - Está escrito en TypeScript y debe utilizar el cliente Supabase importado desde "@/lib/supabaseClient".
// - Las funciones deben lanzar errores descriptivos mediante `throw new Error("PREFIX: mensaje")`
//   para facilitar las pruebas de caja negra y la identificación del origen del fallo.
// - Este módulo expone operaciones de alto nivel que actúan como la capa de negocio sobre
//   las tablas relacionadas con alumnos (por ejemplo: `students`, `student_academic_paths`,
//   `skills`, `student_skills`) y la autenticación (`supabase.auth`).
//
// NOTA: Este archivo contiene firmas y documentación (JSDoc) para cada operación. Las
// implementaciones concretas se deben seguir las pautas indicadas en cada bloque.

import { supabase } from "@/lib/supabaseClient";

/**
 * Tipo de entrada para registrar un alumno:
 * - email, password: se usan para crear el usuario en supabase.auth.
 * - firstName, lastName: se guardan en students.first_name/last_name.
 * - enrollmentNumber: se guarda en students.enrollment_number y es único.
 */
export type RegisterStudentInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  enrollmentNumber: string;
};

/**
 * registerStudent
 * ----------------
 * Crea una cuenta de autenticación en Supabase y, si tiene éxito, registra
 * el perfil del alumno en la tabla `students`.
 *
 * Flujo esperado:
 * 1. Llamar a `supabase.auth.signUp({ email, password })`.
 * 2. Si la llamada a auth falla, lanzar `new Error("AUTH_ERROR: <mensaje>")`.
 * 3. Con el `user.id` devuelto por auth, insertar en `students` los campos:
 *    { id: user.id, first_name, last_name, enrollment_number }
 * 4. Si la inserción en `students` falla (por ejemplo boleta duplicada), lanzar
 *    `new Error("STUDENT_INSERT_ERROR: <mensaje>")`.
 *
 * Contrato:
 * - Entrada: {@link RegisterStudentInput}
 * - Salida: Promise<string> — userId creado.
 * - Errores: "AUTH_ERROR" | "STUDENT_INSERT_ERROR"
 */
export async function registerStudent(input: RegisterStudentInput) {
  const { email, password, firstName, lastName, enrollmentNumber } = input;

  // 1) Crear usuario en Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) {
    throw new Error(`AUTH_ERROR: ${authError.message}`);
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('AUTH_ERROR: no user id returned after signUp');
  }

  // 2) Insertar perfil en students
  const { error: studentError } = await supabase
    .from('students')
    .insert([
      {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        enrollment_number: enrollmentNumber,
      },
    ])
    .select()
    .single();

  if (studentError) {
    // Propagar con prefijo para pruebas
    throw new Error(`STUDENT_INSERT_ERROR: ${studentError.message}`);
  }

  return userId;
}

/**
 * loginStudent
 * ------------
 * Autentica un usuario con correo y contraseña usando Supabase.
 *
 * Contrato:
 * - Entrada: email (string), password (string)
 * - Salida: Promise<any> — objeto de sesión/usuario devuelto por Supabase (según la API de `signInWithPassword`).
 * - Errores: lanzar `new Error("LOGIN_ERROR: <mensaje>")` cuando la autenticación falle.
 *
 * Notas:
 * - No exponer información sensible en los mensajes de error (no incluir la contraseña).
 */
export async function loginStudent(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`LOGIN_ERROR: ${error.message}`);
  }

  return data;
}

/**
 * updateStudentProfile
 * --------------------
 * Actualiza campos opcionales del perfil de un alumno en `students`.
 *
 * Campos soportados (todos opcionales salvo userId):
 * - average: número (por ejemplo promedio general).
 * - status: cadena que represente el estado académico.
 * - serviceSocialStatus: estado del servicio social.
 * - practicesStatus: estado de prácticas profesionales.
 *
 * Contrato:
 * - Entrada: {@link UpdateStudentProfileInput}
 * - Salida: Promise<void> — resuelve cuando el update se aplica.
 * - Errores: lanzar `new Error("STUDENT_UPDATE_ERROR: <mensaje>")` cuando Supabase responda con error.
 *
 * Validaciones recomendadas antes del update:
 * - userId no vacío.
 * - valores numéricos dentro de rangos razonables (por ejemplo average entre 0 y 10 si aplica).
 */
export type UpdateStudentProfileInput = {
  userId: string;
  average?: number;
  status?: string;
  serviceSocialStatus?: string;
  practicesStatus?: string;
};

export async function updateStudentProfile(input: UpdateStudentProfileInput) {
  const { userId, average, status, serviceSocialStatus, practicesStatus } = input;

  if (!userId) {
    throw new Error('STUDENT_UPDATE_ERROR: userId is required');
  }

  const updatePayload: Record<string, unknown> = {};
  if (average !== undefined) updatePayload.average = average;
  if (status !== undefined) updatePayload.status = status;
  if (serviceSocialStatus !== undefined) updatePayload.service_social_status = serviceSocialStatus;
  if (practicesStatus !== undefined) updatePayload.practices_status = practicesStatus;

  if (Object.keys(updatePayload).length === 0) return;

  const { error } = await supabase.from('students').update(updatePayload).eq('id', userId);
  if (error) {
    throw new Error(`STUDENT_UPDATE_ERROR: ${error.message}`);
  }
}

/**
 * addAcademicPath
 * ---------------
 * Registra una trayectoria/periodo académico para un alumno en
 * `student_academic_paths`.
 *
 * Contrato:
 * - Entrada: userId (string), payload { school, level, startYear, endYear? }
 * - Salida: Promise<number> — id del nuevo registro insertado.
 * - Errores: lanzar `new Error("ACADEMIC_PATH_ERROR: <mensaje>")` para errores de inserción
 *   (por ejemplo violación de la restricción única (student_id, school, level)).
 *
 * Reglas:
 * - No silenciar los errores de unicidad: propagar con el prefijo indicado para facilitar pruebas.
 */
export async function addAcademicPath(userId: string, payload: {
  school: string;
  level: string;
  startYear: number;
  endYear?: number;
}) {
  const { school, level, startYear, endYear } = payload;

  try {
    const { data, error } = await supabase
      .from('student_academic_paths')
      .insert([
        {
          student_id: userId,
          school,
          level,
          start_year: startYear,
          end_year: endYear ?? null,
        },
      ])
      .select('id')
      .single();
    if (error) throw error;
    const inserted = data as unknown as { id: number } | null;
    return inserted ? inserted.id : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`ACADEMIC_PATH_ERROR: ${message}`);
  }
}

/**
 * deleteAcademicPath
 * -------------------
 * Elimina una trayectoria académica identificada por `id`.
 *
 * Contrato:
 * - Entrada: id (number)
 * - Salida: Promise<void>
 * - Errores: lanzar `new Error("ACADEMIC_PATH_DELETE_ERROR: <mensaje>")` cuando el delete falle.
 *
 * Nota: comprobar que el registro existe no es obligatorio si se quiere que la operación sea
 * idempotente (el delete simplemente no afecta filas existentes). Sin embargo, para tests de
 * negocio puede ser útil verificar que al menos una fila fue afectada y lanzar si no.
 */
export async function deleteAcademicPath(id: number) {
  const { error } = await supabase.from('student_academic_paths').delete().eq('id', id);
  if (error) {
    throw new Error(`ACADEMIC_PATH_DELETE_ERROR: ${error.message}`);
  }
}
/**
 * addSkillToStudent
 * -----------------
 * Añade una skill al alumno, creando la skill si no existe.
 *
 * Flujo:
 * 1. Buscar `skills` por nombre (case-insensitive según convenga).
 * 2. Si no existe, insertar en `skills` y obtener `skill.id`.
 * 3. Insertar la relación en `student_skills` con { student_id: userId, skill_id }.
 *
 * Contrato:
 * - Entrada: userId (string), skillName (string)
 * - Salida: Promise<{ skillId: number }>
 * - Errores: lanzar `new Error("STUDENT_SKILL_LINK_ERROR: <mensaje>")` si la relación ya existe
 *   o la inserción falla por otro motivo.
 */
export async function addSkillToStudent(userId: string, skillName: string) {
  try {
    // 1) Buscar skill existente
    const { data: existingSkill, error: selectError } = await supabase
      .from('skills')
      .select('id')
      .eq('name', skillName)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    let skillId: number;
    const existing = existingSkill as { id: number } | null;
    if (existing && existing.id) {
      skillId = existing.id;
    } else {
      const { data: newSkill, error: insertError } = await supabase
        .from('skills')
        .insert({ name: skillName })
        .select('id')
        .single();
      if (insertError) throw insertError;
      const created = newSkill as { id: number } | null;
      if (!created) throw new Error('STUDENT_SKILL_LINK_ERROR: failed to create skill');
      skillId = created.id;
    }

    // 3) Insertar relación
    const { error: linkError } = await supabase.from('student_skills').insert({ student_id: userId, skill_id: skillId });
    if (linkError) {
      throw linkError;
    }

    return { skillId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`STUDENT_SKILL_LINK_ERROR: ${message}`);
  }
}
 
/**
 * removeSkillFromStudent
 * ----------------------
 * Elimina la relación entre un alumno y una skill en `student_skills`.
 *
 * Contrato:
 * - Entrada: userId (string), skillId (number)
 * - Salida: Promise<void>
 * - Errores: lanzar `new Error("STUDENT_SKILL_DELETE_ERROR: <mensaje>")` si la operación falla.
 *
 * Recomendación: la operación puede ser idempotente; si no existe la relación, resolver sin error
 * o, si el flujo del producto lo exige, lanzar un error específico.
 */
export async function removeSkillFromStudent(userId: string, skillId: number) {
  const { error } = await supabase
    .from('student_skills')
    .delete()
    .eq('student_id', userId)
    .eq('skill_id', skillId);
  if (error) {
    throw new Error(`STUDENT_SKILL_DELETE_ERROR: ${error.message}`);
  }
}
