import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, List, Clock, CheckCircle, AlertTriangle, Eye, ExternalLink, TrendingUp, Edit, Trash2, Play, Calendar as CalendarIcon, Archive, RotateCcw, AlertCircle as AlertCircleIcon, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, FileWarning } from 'lucide-react';
import { InternTask, Personnel } from '@/types';
import { InternTaskFormDialog } from '@/components/interns/InternTaskFormDialog';
import { InternTaskDetailsDialog } from '@/components/interns/InternTaskDetailsDialog';
import { ReportDialog } from '@/components/interns/ReportDialog';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfToday, startOfWeek, subDays, differenceInDays, endOfDay, addDays, isEqual, parseISO } from 'date-fns';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSession } from '@/context/SessionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { InternTaskCard } from '@/components/interns/InternTaskCard';
import { useInternTasks } from '@/hooks/useInternTasks';

const StatCard = ({ icon, title, value, subtitle, iconBgColor, onClick, isActive }: { icon: React.ElementType, title: string, value: number, subtitle: string, iconBgColor: string, onClick?: () => void, isActive?: boolean }) => {
  const Icon = icon;
  return (
    <Card 
      className={cn("shadow-sm hover:shadow-md transition-shadow cursor-pointer", isActive && "ring-2 ring-blue-500")}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center">
        <div className={cn("p-3 rounded-lg mr-4", iconBgColor)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <TrendingUp className="h-5 w-5 text-green-500" />
      </CardContent>
    </Card>
  );
};

const InternsPage = () => {
  const { session } = useSession();
  const { tasks, personnel, isLoading, invalidateTasks } = useInternTasks();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchTerm = searchParams.get('search') || '';
  const internFilter = searchParams.get('intern') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const showArchived = searchParams.get('archived') === 'true';
  const pageIndex = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const activeDateFilter = searchParams.get('dateFilter') || 'today';
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const dateRange: DateRange | undefined = useMemo(() => {
    if (fromParam) {
      return { from: parseISO(fromParam), to: toParam ? parseISO(toParam) : parseISO(fromParam) };
    }
    return undefined;
  }, [fromParam, toParam]);

  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(() => sessionStorage.getItem('internTaskFormOpen') === 'true');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<InternTask | null>(() => {
    const saved = sessionStorage.getItem('activeInternTask');
    return saved ? JSON.parse(saved) : null;
  });
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<InternTask | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!fromParam) {
      const today = new Date();
      let range: DateRange | undefined;
      if (activeDateFilter === 'today') {
        range = { from: startOfToday(), to: endOfDay(today) };
      } else if (activeDateFilter === 'yesterday') {
        const yesterday = subDays(today, 1);
        range = { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      } else if (activeDateFilter === 'thisWeek') {
        const start = startOfWeek(today, { weekStartsOn: 1 });
        const end = endOfDay(addDays(start, 5));
        range = { from: start, to: end };
      }
      
      if (range?.from) {
        setSearchParams(prev => {
          prev.set('from', format(range!.from!, 'yyyy-MM-dd'));
          prev.set('to', format(range!.to!, 'yyyy-MM-dd'));
          return prev;
        }, { replace: true });
      }
    }
  }, [activeDateFilter, fromParam, setSearchParams]);

  const updateSearchParam = (key: string, value: string | boolean | number) => {
    setSearchParams(prev => {
      const defaults: Record<string, any> = {
        search: '',
        intern: 'all',
        status: 'all',
        archived: false,
        page: 0,
        pageSize: 20,
      };
      if (value === defaults[key]) {
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

  const interns = useMemo(() => personnel.filter(p => p.role === 'Thực tập'), [personnel]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!!task.archived !== showArchived) return false;

      let dateMatch = true;
      if (dateRange?.from) {
        if (!task.created_at) return false;
        const taskDate = new Date(task.created_at);
        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        dateMatch = taskDate >= fromDate && taskDate <= toDate;
      }

      const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'Hoàn thành';
      let statusMatch = true;
      if (statusFilter === 'Quá hạn') {
        statusMatch = isOverdue;
      } else if (statusFilter !== 'all') {
        statusMatch = task.status === statusFilter;
      }

      return (
        (task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.intern_name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (internFilter === 'all' || task.intern_name === internFilter) &&
        statusMatch &&
        dateMatch
      );
    });
  }, [tasks, searchTerm, internFilter, statusFilter, dateRange, showArchived]);

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

  const stats = useMemo(() => ({
    total: filteredTasks.length,
    inProgress: filteredTasks.filter(t => t.status === 'Đang làm').length,
    completed: filteredTasks.filter(t => t.status === 'Hoàn thành').length,
    overdue: filteredTasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành').length,
  }), [filteredTasks]);

  const handleSetFormOpen = (open: boolean) => {
    setIsFormOpen(open);
    if (open) {
      sessionStorage.setItem('internTaskFormOpen', 'true');
    } else {
      sessionStorage.removeItem('internTaskFormOpen');
      sessionStorage.removeItem('activeInternTask');
      sessionStorage.removeItem('internTaskFormData');
    }
  };

  const handleOpenAddDialog = () => {
    setActiveTask(null);
    sessionStorage.removeItem('activeInternTask');
    handleSetFormOpen(true);
  };

  const handleOpenEditDialog = (task: InternTask) => {
    setActiveTask(task);
    sessionStorage.setItem('activeInternTask', JSON.stringify(task));
    handleSetFormOpen(true);
  };

  const handleOpenDetailsDialog = (task: InternTask) => {
    setActiveTask(task);
    setIsDetailsOpen(true);
  };

  const handleOpenReportDialog = (task: InternTask) => {
    setActiveTask(task);
    setIsReportOpen(true);
  };

  const handleOpenDeleteDialog = (task: InternTask) => {
    setTaskToDelete(task);
    setIsDeleteAlertOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    if (activeTask && activeTask.id) {
      const { error } = await supabase.from('intern_tasks').update(taskData).eq('id', activeTask.id);
      if (error) showError("Lỗi khi cập nhật công việc.");
      else showSuccess("Công việc đã được cập nhật!");
    } else {
      if (!session?.user) {
        showError("Không thể xác định người dùng. Vui lòng đăng nhập lại.");
        return;
      }
      
      const currentUserInfo = personnel.find(p => p.id === session.user.id);
      const assignerName = currentUserInfo?.name || session.user.email;

      const dataToSave = { 
        ...taskData, 
        assigner_name: assignerName,
        status: 'Chưa làm' 
      };
      const { error } = await supabase.from('intern_tasks').insert([dataToSave]);
      if (error) {
        showError("Lỗi khi giao việc mới.");
        console.error(error);
      } else {
        showSuccess("Đã giao việc mới thành công!");
      }
    }
    invalidateTasks();
    handleSetFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    const { error } = await supabase.from('intern_tasks').delete().eq('id', taskToDelete.id);
    if (error) showError("Lỗi khi xóa công việc.");
    else showSuccess("Đã xóa công việc.");
    invalidateTasks();
    setIsDeleteAlertOpen(false);
    setTaskToDelete(null);
  };

  const handleUpdateStatus = async (task: InternTask, newStatus: InternTask['status']) => {
    let updateData: Partial<InternTask> = { status: newStatus };
    if (newStatus === 'Đang làm' && !task.started_at) {
      updateData.started_at = new Date().toISOString();
    } else if (newStatus === 'Hoàn thành') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('intern_tasks').update(updateData).eq('id', task.id);
    if (error) showError("Lỗi khi cập nhật trạng thái.");
    else {
      showSuccess("Đã cập nhật trạng thái công việc.");
      invalidateTasks();
    }
  };

  const handleReportSubmit = async (reason: string) => {
    if (!activeTask) return;
    const updateData: Partial<InternTask> = {
      report_reason: reason,
      status: 'Đang làm',
      started_at: activeTask.started_at || new Date().toISOString(),
    };
    const { error } = await supabase.from('intern_tasks').update(updateData).eq('id', activeTask.id);
    if (error) {
      showError("Lỗi khi gửi báo cáo.");
    } else {
      showSuccess("Đã gửi báo cáo thành công.");
      invalidateTasks();
    }
  };

  const handleBulkAction = async (action: 'archive' | 'restore' | 'delete') => {
    if (selectedTasks.length === 0) return;
    if (action === 'delete') {
      const { error } = await supabase.from('intern_tasks').delete().in('id', selectedTasks);
      if (error) showError("Lỗi khi xóa hàng loạt.");
      else showSuccess(`Đã xóa ${selectedTasks.length} công việc.`);
    } else {
      const { error } = await supabase.from('intern_tasks').update({ archived: action === 'archive' }).in('id', selectedTasks);
      if (error) showError(`Lỗi khi ${action === 'archive' ? 'lưu trữ' : 'khôi phục'} công việc.`);
      else showSuccess(`Đã ${action === 'archive' ? 'lưu trữ' : 'khôi phục'} ${selectedTasks.length} công việc.`);
    }
    invalidateTasks();
    setSelectedTasks([]);
  };

  const getStatusBadgeStyle = (status: InternTask['status'], isOverdue: boolean) => {
    if (isOverdue) return 'bg-red-100 text-red-800';
    switch (status) {
      case 'Đang làm': return 'bg-blue-100 text-blue-800';
      case 'Hoàn thành': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setSearchParams(prev => {
      prev.set('dateFilter', 'custom');
      if (range?.from) {
        prev.set('from', format(range.from, 'yyyy-MM-dd'));
      } else {
        prev.delete('from');
      }
      if (range?.to) {
        prev.set('to', format(range.to, 'yyyy-MM-dd'));
      } else {
        prev.delete('to');
      }
      return prev;
    }, { replace: true });
    setIsTimeFilterOpen(false);
  };

  const handleTimePresetSelect = (preset: 'today' | 'yesterday' | 'thisWeek') => {
    updateSearchParam('dateFilter', preset);
    setSearchParams(prev => {
      prev.delete('from');
      prev.delete('to');
      return prev;
    }, { replace: true });
  };

  const getTimeFilterLabel = () => {
    switch (activeDateFilter) {
      case 'today': return 'Hôm nay';
      case 'yesterday': return 'Hôm qua';
      case 'thisWeek': return 'Tuần này';
      case 'custom':
        if (dateRange?.from) {
          if (dateRange.to && !isEqual(startOfDay(dateRange.from), startOfDay(dateRange.to))) {
            return `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM/yyyy")}`;
          }
          return format(dateRange.from, "dd/MM/yyyy");
        }
        return 'Chọn ngày';
      default: return 'Thời gian';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Giao việc thực tập sinh</h1>
            <p className="text-muted-foreground">Quản lý và theo dõi công việc được giao cho thực tập sinh</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-white w-full sm:w-auto" onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Giao việc mới
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={List} title="Tổng số việc" value={stats.total} subtitle="Tất cả công việc" iconBgColor="bg-blue-500" onClick={() => updateSearchParam('status', 'all')} isActive={statusFilter === 'all'} />
          <StatCard icon={Clock} title="Đang thực hiện" value={stats.inProgress} subtitle="Công việc đang chạy" iconBgColor="bg-cyan-500" onClick={() => updateSearchParam('status', 'Đang làm')} isActive={statusFilter === 'Đang làm'} />
          <StatCard icon={CheckCircle} title="Hoàn thành" value={stats.completed} subtitle="Công việc đã xong" iconBgColor="bg-green-500" onClick={() => updateSearchParam('status', 'Hoàn thành')} isActive={statusFilter === 'Hoàn thành'} />
          <StatCard icon={AlertTriangle} title="Quá hạn" value={stats.overdue} subtitle="Công việc trễ deadline" iconBgColor="bg-red-500" onClick={() => updateSearchParam('status', 'Quá hạn')} isActive={statusFilter === 'Quá hạn'} />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 flex-wrap">
          <div className="relative flex-1 w-full sm:w-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Tìm kiếm công việc..." className="pl-10" value={searchTerm} onChange={(e) => updateSearchParam('search', e.target.value)} /></div>
          <Select value={internFilter} onValueChange={(value) => updateSearchParam('intern', value)}><SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Lọc theo thực tập sinh" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả thực tập sinh</SelectItem>{interns.map(intern => <SelectItem key={intern.id} value={intern.name}>{intern.name}</SelectItem>)}</SelectContent></Select>
          
          <DropdownMenu open={isTimeFilterOpen} onOpenChange={setIsTimeFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[180px] justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {getTimeFilterLabel()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleTimePresetSelect('today')}>Hôm nay</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleTimePresetSelect('yesterday')}>Hôm qua</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleTimePresetSelect('thisWeek')}>Tuần này</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>Chọn ngày...</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-auto p-0">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={1}
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="w-full sm:w-auto" onClick={() => updateSearchParam('archived', !showArchived)}>{showArchived ? <List className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}{showArchived ? "Công việc hoạt động" : "Công việc đã lưu trữ"}</Button>
        </div>
        
        {selectedTasks.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleBulkAction(showArchived ? 'restore' : 'archive')}>
              {showArchived ? <RotateCcw className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
              {showArchived ? 'Khôi phục' : 'Lưu trữ'} ({selectedTasks.length})
            </Button>
            <Button variant="destructive" onClick={() => handleBulkAction('delete')}><Trash2 className="mr-2 h-4 w-4" />Xóa ({selectedTasks.length})</Button>
          </div>
        )}

        {isMobile ? (
          <div className="space-y-4">
            {isLoading ? <p>Đang tải...</p> : paginatedTasks.map(task => (
              <InternTaskCard key={task.id} task={task} onViewDetails={handleOpenDetailsDialog} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => setSelectedTasks(checked ? filteredTasks.map(t => t.id) : [])} /></TableHead>
                    <TableHead className="w-[25%]">CÔNG VIỆC</TableHead>
                    <TableHead>CMT</TableHead>
                    <TableHead>POST</TableHead>
                    <TableHead>POST SCAN</TableHead>
                    <TableHead>FILE</TableHead>
                    <TableHead>DEADLINE</TableHead>
                    <TableHead>NGƯỜI GIAO</TableHead>
                    <TableHead>NGƯỜI NHẬN</TableHead>
                    <TableHead>TRẠNG THÁI</TableHead>
                    <TableHead>HÀNH ĐỘNG</TableHead>
                    <TableHead>THAO TÁC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={12} className="text-center">Đang tải...</TableCell></TableRow> :
                  paginatedTasks.map(task => {
                    const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'Hoàn thành';
                    const overdueDays = isOverdue ? differenceInDays(new Date(), new Date(task.deadline)) : 0;
                    const completedLate = task.status === 'Hoàn thành' && task.completed_at && (new Date(task.completed_at) > new Date(task.deadline));
                    const displayStatus = isOverdue ? 'Quá hạn' : task.status;

                    return (
                    <TableRow key={task.id} className={cn(completedLate && "bg-red-50")}>
                      <TableCell><Checkbox checked={selectedTasks.includes(task.id)} onCheckedChange={(checked) => setSelectedTasks(checked ? [...selectedTasks, task.id] : selectedTasks.filter(id => id !== task.id))} /></TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium truncate cursor-pointer hover:underline" onClick={() => handleOpenDetailsDialog(task)}>{task.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">{task.comment_count}</div>
                      </TableCell>
                      <TableCell>
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">{task.post_count}</div>
                      </TableCell>
                      <TableCell>
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">{task.post_scan_count || 0}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <a href={task.work_link} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:text-blue-800 inline-block">
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </TableCell>
                      <TableCell className={cn(isOverdue && "text-red-600")}>
                        {new Date(task.deadline).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {isOverdue && (
                          <div className="flex items-center font-bold mt-1 text-xs">
                            <AlertCircleIcon className="h-3 w-3 mr-1" />
                            <span>Trễ {overdueDays} ngày</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{task.assigner_name}</TableCell>
                      <TableCell>{task.intern_name}</TableCell>
                      <TableCell><Badge className={cn("capitalize", getStatusBadgeStyle(task.status, isOverdue))}>{displayStatus}</Badge></TableCell>
                      <TableCell>
                        {(() => {
                          if (task.status === 'Hoàn thành') return null;
                          if (isOverdue && !task.report_reason) {
                            return (
                              <Button size="sm" variant="destructive" onClick={() => handleOpenReportDialog(task)}>
                                <FileWarning className="mr-2 h-4 w-4" /> Báo cáo
                              </Button>
                            );
                          }
                          const isStarted = task.status === 'Đang làm';
                          return (
                            <Button 
                              size="sm" 
                              className={cn(!isStarted ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600')}
                              onClick={() => handleUpdateStatus(task, !isStarted ? 'Đang làm' : 'Hoàn thành')}
                            >
                              {!isStarted ? <><Play className="mr-2 h-4 w-4" />Bắt đầu</> : <><CheckCircle className="mr-2 h-4 w-4" />Hoàn thành</>}
                            </Button>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100" onClick={() => handleOpenDetailsDialog(task)}>
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-100" onClick={() => handleOpenEditDialog(task)}>
                            <Edit className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100" onClick={() => handleOpenDeleteDialog(task)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
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
      <InternTaskFormDialog
        open={isFormOpen}
        onOpenChange={handleSetFormOpen}
        onSave={handleSaveTask}
        task={activeTask}
        interns={interns}
      />
      <InternTaskDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        task={activeTask}
      />
      <ReportDialog
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        onSubmit={handleReportSubmit}
      />
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Công việc "{taskToDelete?.title}" sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default InternsPage;