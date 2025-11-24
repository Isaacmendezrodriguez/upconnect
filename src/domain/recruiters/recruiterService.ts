// Copilot, crea en este archivo un servicio de dominio para gestionar reclutadores (empresas)
// en el sistema UPICONNECT. Usa el cliente Supabase desde "@/lib/supabaseClient".
// Queremos cubrir RF3 (Registrar Reclutadores), RF10 y RF22 (Agregar/Modificar intereses).
// IMPORTANTE: lanza errores con prefijos claros para pruebas, por ejemplo:
//  - "AUTH_ERROR: ..."
//  - "RECRUITER_INSERT_ERROR: ..."
//  - "RECRUITER_INTEREST_ERROR: ..."
//  - "RECRUITER_INTEREST_DELETE_ERROR: ..."

import { supabase } from "@/lib/supabaseClient";

export type RegisterRecruiterInput = {
  email: string;
  password: string;
  companyName: string;
  position?: string;
};

/**
 * registerRecruiter:
 * 1) Llama a supabase.auth.signUp con email y password.
 * 2) Si falla, lanza un Error con prefijo "AUTH_ERROR".
 * 3) Obtiene el user.id del usuario creado.
 * 4) Inserta un registro en la tabla "recruiters" con:
 *    - id = user.id
 *    - company_name = companyName
 *    - position
 *    - contact_email = email
 * 5) Si falla la inserción en recruiters, lanza Error con prefijo "RECRUITER_INSERT_ERROR".
 * 6) Devuelve el userId.
 */
export async function registerRecruiter(input: RegisterRecruiterInput) {
  const { email, password, companyName, position } = input;

  // 1) Crear usuario en Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) {
    throw new Error(`AUTH_ERROR: ${authError.message}`);
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('AUTH_ERROR: no user id returned after signUp');
  }

  // 2) Insertar registro en recruiters
  const { error } = await supabase
    .from('recruiters')
    .insert([
      {
        id: userId,
        company_name: companyName,
        position: position ?? null,
        contact_email: email,
      },
    ]);

  if (error) {
    throw new Error(`RECRUITER_INSERT_ERROR: ${error.message}`);
  }

  return userId;
}

/**
 * addInterest:
 * Inserta un registro en la tabla "recruiter_interests" con:
 *  - recruiter_id
 *  - interest
 * Si falla, lanza Error con prefijo "RECRUITER_INTEREST_ERROR".
 */
export async function addInterest(recruiterId: string, interest: string) {
  try {
    const { data, error } = await supabase
      .from('recruiter_interests')
      .insert({ recruiter_id: recruiterId, interest })
      .select()
      .single();

    if (error) {
      throw error; //Implemento las funciones de jobService.ts
    }

    const inserted = data as { id: number } | null;
    return inserted ? inserted.id : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`RECRUITER_INTEREST_ERROR: ${message}`);
  }
}

/**
 * deleteInterest:
 * Elimina un registro de la tabla "recruiter_interests" filtrando por id.
 * Si falla, lanza Error con prefijo "RECRUITER_INTEREST_DELETE_ERROR".
 */
export async function deleteInterest(id: number) {
  const { error } = await supabase.from('recruiter_interests').delete().eq('id', id);
  if (error) {
    throw new Error(`RECRUITER_INTEREST_DELETE_ERROR: ${error.message}`);
  }
}

/**
 * updateRecruiterProfile:
 * - Actualiza company_name y position del recruiter identificado por recruiterId.
 * - Si falla, lanza Error con prefijo `RECRUITER_UPDATE_ERROR`.
 */
export async function updateRecruiterProfile(recruiterId: string, payload: { companyName?: string; position?: string }) {
  try {
    const { error } = await supabase
      .from('recruiters')
      .update({ company_name: payload.companyName ?? undefined, position: payload.position ?? undefined })
      .eq('id', recruiterId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`RECRUITER_UPDATE_ERROR: ${message}`);
  }
}
