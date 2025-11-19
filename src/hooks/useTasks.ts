import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task, Personnel } from "@/types";
import { useSession } from "@/contexts/SessionContext";

const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, assigner:personnel!tasks_assigner_id_fkey(*), assignee:personnel!tasks_assignee_id_fkey(*), feedback(*)")
    .order('created_at', { ascending: false });

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
    queryKey: ['tasks', currentUserPersonnel?.id], // Role is no longer needed
    queryFn: fetchTasks, // No longer needs arguments
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