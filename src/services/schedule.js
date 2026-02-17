import { supabase } from './supabase';

export async function createSchedule(schedule) {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');

  if (companyIdError) {
    console.error("Error fetching company_id for RLS in createSchedule:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert({ ...schedule, company_id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSchedulesByDate(date) {
  const localDateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`; // YYYY-MM-DD (Local)
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('date', localDateStr)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getAllSchedules() {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateSchedule(id, updates) {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSchedule(id) {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id);

  if (error) throw error;
}