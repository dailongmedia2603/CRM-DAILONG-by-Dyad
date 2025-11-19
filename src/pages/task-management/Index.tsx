import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle, Search, Trash2, CalendarIcon, Eye, Edit, Play, CheckCircle, MessageSquare, List, ArrowLeft, AlertTriangle, Clock, ChevronDown, Archive, RotateCcw, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaskStatsCard } from "@/components/task-management/TaskStatsCard";
import { TaskFormDialog } from "@/components/task-management/TaskFormDialog";
import { FeedbackDialog } from "@/components/task-management/FeedbackDialog";
import { TaskDetailsDialog } from "@/components/task-management/TaskDetailsDialog";
import { Task, Feedback, Personnel } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { format, isSameDay, parseISO, isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TaskCard } from "@/components/task-management/TaskCard";
import { useTasks } from "@/hooks/useTasks";

const TasksManagementPage = () => {
  const { personnel: currentUserPersonnel } = useSession();
  const { tasks, personnel, isLoading, invalidateTasks } = useTasks();
  const [searchParams, setSearchParams] = useSearchParams();

  const dateQuery = searchParams.get('date');
  const dateFilter = dateQuery ? parseISO(dateQuery) : null;
  const searchTerm = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const priorityFilter = searchParams.get('priority') || 'all';
  const showCompleted = searchParams.get('completed') === 'true';
  const showArchived = searchParams.get('archived') === 'true';
  const pageIndex = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const [dialogs, setDialogs] = useState({ form: false, feedback: false, details: false, delete: false, bulkDelete: false });
  const [activeTask, setActiveTask] = useState<Task | null>(() => {
    const saved = sessionStorage.getItem('activeTask');
    return saved ? JSON.parse(saved) : null;
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    const formOpen = sessionStorage.getItem('taskFormOpen') === 'true';
    if (formOpen) {
      setDialogs(prev => ({ ...prev, form: true }));
    }
  }, []);

  const updateSearchParam = (key: string, value: string | boolean | number | Date | null) => {
    setSearchParams(prev => {
      const defaults: Record<string, any> = {
        date: null,
        search: '',
        status: 'all',
        priority: 'all',
        completed: false,
        archived: false,
        page: 0,
        pageSize: 20,
      };

      if (key === 'date') {
        if (value) {
          prev.set('date', format(value as Date, 'yyyy-MM-dd'));
        } else {
          prev.delete('date');
        }
      } else if (value === defaults[key]) {
        prev.delete(key);
      } else {
        prev.set(key, String(value));
      }

      if (key !== 'page') {
        prev.delete('page');
      }
      return prev;
    }, { replace: true });
  };

  const currentUser = useMemo(() => {
    if (currentUserPersonnel) {
      return { id: currentUserPersonnel.id, name: currentUserPersonnel.name };
    }
    return { id: '', name: '' };
  }, [currentUserPersonnel]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => task.archived === showArchived);
    if (dateFilter) filtered = filtered.filter(task => isSameDay(new Date(task.created_at), dateFilter));
    if (searchTerm) filtered = filtered.filter(task => task.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter !== 'all') filtered = filtered.filter(task => task.status === statusFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter(task => task.priority === priorityFilter);
    if (!showArchived) {
      filtered = filtered.filter(task => showCompleted ? task.status === 'Hoàn thành' : task.status !== 'Hoàn thành');
    }
    return filtered;
  }, [tasks, dateFilter, searchTerm, statusFilter, priorityFilter, showCompleted, showArchived]);

  const paginatedTasks = useMemo(() => {
    if (pageSize === 0) return filteredTasks;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return filteredTasks.slice(start, end);
  }, [filteredTasks, pageIndex, pageSize]);

  const pageCount = useMemo(() => {
    if (pageSize === 0) return 1;
    return Math.ceil(filteredTasks.length / pageSize);
  }, [filteredTasks, pageSize]);

  const stats = useMemo(() => {
    const relevantTasks = dateFilter ? tasks.filter(task => isSameDay(new Date(task.created_at), dateFilter)) : tasks;
    return {
      total: relevantTasks.length,
      todo: relevantTasks.filter(t => t.status === 'Chưa làm').length,
      completed: relevantTasks.filter(t => t.status === 'Hoàn thành').length,
      high: relevantTasks.filter(t => t.priority === 'Cao').length,
      medium: relevantTasks.filter(t => t.priority === 'Trung bình').length,
      low: relevantTasks.filter(t => t.priority === 'Thấp').length,
    };
  }, [tasks, dateFilter]);

  const handleStatClick = (type: 'status' | 'priority', value: string) => {
    if (type === 'status') {
      updateSearchParam('status', value);
      updateSearchParam('priority', 'all');
      updateSearchParam('completed', value === 'Hoàn thành');
    } else {
      updateSearchParam('priority', value);
      updateSearchParam('status', 'all');
    }
  };

  const closeDialog = (name: keyof typeof dialogs) => setDialogs(prev => ({ ...prev, [name]: false }));

  const handleSetFormOpen = (open: boolean) => {
    setDialogs(prev => ({ ...prev, form: open }));
    if (open) {
      sessionStorage.setItem('taskFormOpen', 'true');
    } else {
      sessionStorage.removeItem('taskFormOpen');
      sessionStorage.removeItem('activeTask');
      sessionStorage.removeItem('taskFormData');
    }
  };

  const openDialog = (name: keyof typeof dialogs, task?: Task) => {
    setActiveTask(task || null);
    if (name === 'form') {
      sessionStorage.setItem('activeTask', JSON.stringify(task || null));
      handleSetFormOpen(true);
    } else {
      setDialogs(prev => ({ ...prev, [name]: true }));
    }
  };

  const handleSaveTask = async (data: any) => {
    const { id, ...taskData } = data;
    if (activeTask) {
      const { error } = await supabase.from('tasks').update(taskData).eq('id', activeTask.id);
      if (error) {
        console.error("Update Error:", error);
        showError("Lỗi khi cập nhật công việc.");
      } else {
        showSuccess("Cập nhật công việc thành công!");
      }
    } else {
      if (!taskData.assigner_id) {
        showError("Không thể tạo công việc: thiếu người giao việc.");
        return;
      }
      const { error } = await supabase.from('tasks').insert([taskData]);
      if (error) {
        console.error("Insert Error:", error);
        showError("Lỗi khi thêm công việc mới.");
      } else {
        showSuccess("Thêm công việc mới thành công!");
      }
    }
    invalidateTasks();
    handleSetFormOpen(false);
  };

  const handleDelete = async (task: Task) => {
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) showError("Lỗi khi xóa công việc.");
    else showSuccess("Đã xóa công việc.");
    invalidateTasks();
    closeDialog('delete');
  };

  const handleBulkAction = async (action: 'archive' | 'restore' | 'delete') => {
    if (action === 'delete') {
      openDialog('bulkDelete');
      return;
    }
    const archiveValue = action === 'archive';
    const { error } = await supabase.from('tasks').update({ archived: archiveValue }).in('id', selectedTasks);
    if (error) showError(`Lỗi khi ${archiveValue ? 'lưu trữ' : 'khôi phục'} công việc.`);
    else {
      showSuccess(`Đã ${archiveValue ? 'lưu trữ' : 'khôi phục'} ${selectedTasks.length} công việc.`);
      invalidateTasks();
      setSelectedTasks([]);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    const { error } = await supabase.from('tasks').delete().in('id', selectedTasks);
    if (error) showError("Lỗi khi xóa hàng loạt.");
    else showSuccess(`Đã xóa ${selectedTasks.length} công việc.`);
    invalidateTasks();
    setSelectedTasks([]);
    closeDialog('bulkDelete');
  };

  const handleActionClick = async (task: Task) => {
    const newStatus = task.status === 'Chưa làm' ? 'Đang làm' : 'Hoàn thành';
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    if (error) showError("Lỗi khi cập nhật trạng thái.");
    else showSuccess(`Đã ${newStatus === 'Đang làm' ? 'bắt đầu' : 'hoàn thành'} công việc.`);
    invalidateTasks();
  };

  const handleAddFeedback = async (message: string) => {
    if (!activeTask) return;
    const newFeedback = { task_id: activeTask.id, user_id: currentUser.id, user_name: currentUser.name, message };
    const { error } = await supabase.from('feedback').insert([newFeedback]);
    if (error) showError("Lỗi khi gửi feedback.");
    else invalidateTasks();
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    if (priority === 'Cao') return 'bg-red-100 text-red-800';
    if (priority === 'Trung bình') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: Task['status']) => {
    if (status === 'Hoàn thành') return 'bg-green-100 text-green-800';
    if (status === 'Đang làm') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div><h1 className="text-2xl font-bold">Quản lý Công việc</h1><p className="text-muted-foreground">Quản lý công việc nội bộ của agency.</p></div>
          <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><CalendarIcon className="mr-2 h-4 w-4" />{dateFilter ? format(dateFilter, "dd/MM/yyyy") : "Chọn ngày"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFilter} onSelect={(date) => updateSearchParam('date', date || null)} /></PopoverContent></Popover>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <TaskStatsCard title="Tổng Task" value={stats.total.toString()} subtitle="Tất cả công việc" icon={List} iconBgColor="bg-blue-500" onClick={() => { updateSearchParam('status', 'all'); updateSearchParam('priority', 'all'); }} isActive={statusFilter === 'all' && priorityFilter === 'all'} />
          <TaskStatsCard title="Chưa làm" value={stats.todo.toString()} subtitle="Công việc cần bắt đầu" icon={Play} iconBgColor="bg-cyan-500" onClick={() => handleStatClick('status', 'Chưa làm')} isActive={statusFilter === 'Chưa làm'} />
          <TaskStatsCard title="Hoàn thành" value={stats.completed.toString()} subtitle="Công việc đã xong" icon={CheckCircle} iconBgColor="bg-green-500" onClick={() => handleStatClick('status', 'Hoàn thành')} isActive={statusFilter === 'Hoàn thành'} />
          <TaskStatsCard title="Ưu tiên Cao" value={stats.high.toString()} subtitle="Cần làm ngay" icon={AlertTriangle} iconBgColor="bg-red-500" onClick={() => handleStatClick('priority', 'Cao')} isActive={priorityFilter === 'Cao'} />
          <TaskStatsCard title="Ưu tiên TB" value={stats.medium.toString()} subtitle="Theo kế hoạch" icon={Clock} iconBgColor="bg-amber-500" onClick={() => handleStatClick('priority', 'Trung bình')} isActive={priorityFilter === 'Trung bình'} />
          <TaskStatsCard title="Ưu tiên Thấp" value={stats.low.toString()} subtitle="Làm sau" icon={ChevronDown} iconBgColor="bg-gray-500" onClick={() => handleStatClick('priority', 'Thấp')} isActive={priorityFilter === 'Thấp'} />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <div className="relative flex-grow w-full"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Tìm kiếm..." className="pl-8" value={searchTerm} onChange={e => updateSearchParam('search', e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={(value) => updateSearchParam('status', value)}><SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem><SelectItem value="Chưa làm">Chưa làm</SelectItem><SelectItem value="Đang làm">Đang làm</SelectItem><SelectItem value="Hoàn thành">Hoàn thành</SelectItem></SelectContent></Select>
            <Select value={priorityFilter} onValueChange={(value) => updateSearchParam('priority', value)}><SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Ưu tiên" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả ưu tiên</SelectItem><SelectItem value="Cao">Cao</SelectItem><SelectItem value="Trung bình">Trung bình</SelectItem><SelectItem value="Thấp">Thấp</SelectItem></SelectContent></Select>
            {selectedTasks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto">Thao tác ({selectedTasks.length})</Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkAction(showArchived ? 'restore' : 'archive')}>
                    {showArchived ? <RotateCcw className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                    {showArchived ? 'Khôi phục' : 'Lưu trữ'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('delete')} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button variant="outline" onClick={() => updateSearchParam('archived', !showArchived)}>{showArchived ? <List className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}{showArchived ? "Hoạt động" : "Lưu trữ"}</Button>
            <Button variant="outline" onClick={() => updateSearchParam('completed', !showCompleted)}>{showCompleted ? <><ArrowLeft className="mr-2 h-4 w-4" />Trở về</> : <><List className="mr-2 h-4 w-4" />Hoàn thành</>}</Button>
            <Button onClick={() => openDialog('form')} disabled={isLoading || !currentUser.id}><PlusCircle className="mr-2 h-4 w-4" />Thêm</Button>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-4">
            {isLoading ? <p>Đang tải...</p> : paginatedTasks.map(task => (
              <TaskCard key={task.id} task={task} onViewDetails={(t) => openDialog('details', t)} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12"><Checkbox checked={selectedTasks.length > 0 && selectedTasks.length === filteredTasks.length} onCheckedChange={(checked) => setSelectedTasks(checked ? filteredTasks.map(t => t.id) : [])} /></TableHead><TableHead>Tên công việc</TableHead><TableHead>Người giao</TableHead><TableHead>Người nhận</TableHead><TableHead>Deadline</TableHead><TableHead>Ưu tiên</TableHead><TableHead>Feedback</TableHead><TableHead>Trạng thái</TableHead><TableHead>Action</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={10} className="text-center">Đang tải...</TableCell></TableRow> :
                paginatedTasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell><Checkbox checked={selectedTasks.includes(task.id)} onCheckedChange={(checked) => setSelectedTasks(checked ? [...selectedTasks, task.id] : selectedTasks.filter(id => id !== task.id))} /></TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{task.name}</TableCell>
                    <TableCell>{task.assigner?.name || 'N/A'}</TableCell>
                    <TableCell>{task.assignee?.name || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(task.deadline), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell><Badge variant="outline" className={cn(getPriorityBadge(task.priority))}>{task.priority}</Badge></TableCell>
                    <TableCell><Button variant="outline" size="sm" onClick={() => openDialog('feedback', task)} className={cn({ "text-red-600 border-red-500 hover:bg-red-50 hover:text-red-700 font-bold": task.feedbackHistory.length > 0 })}><MessageSquare className="mr-2 h-4 w-4" />{task.feedbackHistory.length}</Button></TableCell>
                    <TableCell><Badge variant="outline" className={cn(getStatusBadge(task.status))}>{task.status}</Badge></TableCell>
                    <TableCell>{task.status !== 'Hoàn thành' && (<Button size="sm" onClick={() => handleActionClick(task)} className={cn(task.status === 'Chưa làm' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white')}>{task.status === 'Chưa làm' ? <><Play className="mr-2 h-4 w-4" />Bắt đầu</> : <><CheckCircle className="mr-2 h-4 w-4" />Hoàn thành</>}</Button>)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100" onClick={() => openDialog('details', task)}>
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-100" onClick={() => openDialog('form', task)}>
                          <Edit className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100" onClick={() => openDialog('delete', task)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {selectedTasks.length} của {filteredTasks.length} dòng được chọn.
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Số dòng mỗi trang</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => updateSearchParam('pageSize', Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize === 0 ? "Tất cả" : pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[20, 50, 100].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
                <SelectItem value="0">Tất cả</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Trang {pageIndex + 1} của {pageCount}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => updateSearchParam('page', 0)}
              disabled={pageIndex === 0}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => updateSearchParam('page', pageIndex - 1)}
              disabled={pageIndex === 0}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => updateSearchParam('page', pageIndex + 1)}
              disabled={pageIndex >= pageCount - 1}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => updateSearchParam('page', pageCount - 1)}
              disabled={pageIndex >= pageCount - 1}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <TaskFormDialog open={dialogs.form} onOpenChange={handleSetFormOpen} onSave={handleSaveTask} task={activeTask} personnel={personnel} currentUser={currentUser} />
      {activeTask && <FeedbackDialog open={dialogs.feedback} onOpenChange={() => closeDialog('feedback')} taskName={activeTask.name} history={activeTask.feedbackHistory} onAddFeedback={handleAddFeedback} currentUser={currentUser} />}
      {activeTask && <TaskDetailsDialog open={dialogs.details} onOpenChange={() => closeDialog('details')} task={activeTask} />}
      {activeTask && <AlertDialog open={dialogs.delete} onOpenChange={() => closeDialog('delete')}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn công việc "{activeTask.name}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(activeTask)}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
      <AlertDialog open={dialogs.bulkDelete} onOpenChange={() => closeDialog('bulkDelete')}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa hàng loạt?</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn {selectedTasks.length} công việc đã chọn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleBulkDeleteConfirm}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </MainLayout>
  );
};

export default TasksManagementPage;