import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task, Personnel } from "@/types";
import { useSession } from "@/contexts/SessionContext";

const fetchTasks = async (userId: string, userRole: string): Promise<Task[]> => {
  let query = supabase
    .from("tasks")
    .select("*, assigner:personnel!tasks_assigner_id_fkey(*), assignee:personnel!tasks_assignee_id_fkey(*), feedback(*)")
    .order('created_at', { ascending: false });

  // If user is not BOD, filter by assignee_id
  if (userRole !== 'BOD') {
    query = query.eq('assignee_id', userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  
  const tasksWithFeedback = data.map(task => ({
    ...task,
    feedbackHistory: task.feedback || [],
  }));
  return tasksWithFeedback as any[];
};

const fetchPersonnel = async (): Promise<Personnel[]> => {
  const { data, error } = await supabase.from("personnel").select("*");
  if (error) throw new Error(error.message);
  return data as Personnel[];
};

export const useTasks = () => {
  const queryClient = useQueryClient();
  const { personnel: currentUserPersonnel } = useSession();

  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['tasks', currentUserPersonnel?.id, currentUserPersonnel?.role],
    queryFn: () => fetchTasks(currentUserPersonnel!.id, currentUserPersonnel!.role),
    enabled: !!currentUserPersonnel,
  });

  const { data: personnel, isLoading: isLoadingPersonnel, error: personnelError } = useQuery<Personnel[]>({
    queryKey: ['personnel'],
    queryFn: fetchPersonnel,
  });

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  return {
    tasks: tasks || [],
    personnel: personnel || [],
    isLoading: isLoadingTasks || isLoadingPersonnel,
    error: tasksError || personnelError,
    invalidateTasks,
  };
};