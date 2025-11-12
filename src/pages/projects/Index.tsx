import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Search,
  Archive,
  Trash2,
  List,
  Folder,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RotateCcw,
  AlertCircle as AlertCircleIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectStatsCard } from "@/components/projects/ProjectStatsCard";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { AcceptanceDialog } from "@/components/projects/AcceptanceDialog";
import { Project } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProjectCardMobile } from "@/components/projects/ProjectCardMobile";
import { ProjectDetailsDialog } from "@/components/projects/ProjectDetailsDialog";
import { useProjects } from "@/hooks/useProjects";
import usePersistentState from "@/hooks/usePersistentState";
import { useSession } from "@/context/SessionContext";

const ProjectsPage = () => {
  const { session } = useSession();
  const { projects: projectsFromHook, clients, isLoading, invalidateProjects } = useProjects();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const searchTerm = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all";
  const showArchived = searchParams.get("archived") === "true";
  const pageIndex = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  
  const [isFormOpen, setIsFormOpen] = usePersistentState('projectFormOpen', false);
  const [projectToEdit, setProjectToEdit] = usePersistentState<Project | null>('projectToEdit', null);
  
  const [isAcceptanceOpen, setIsAcceptanceOpen] = useState(false);
  const [projectToComplete, setProjectToComplete] = useState<Project | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  const isMobile = useIsMobile();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [projectForDetails, setProjectForDetails] = useState<Project | null>(null);

  useEffect(() => {
    setProjects(projectsFromHook);
  }, [projectsFromHook]);

  const updateSearchParam = (key: string, value: string | boolean | number) => {
    setSearchParams(prev => {
      const defaults: Record<string, any> = {
        search: '',
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

  const statusTextMap: { [key: string]: string } = {
    planning: "Pending",
    "in-progress": "Đang chạy",
    completed: "Hoàn thành",
    overdue: "Quá hạn",
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (project.archived !== showArchived) return false;
      if (searchTerm && !`${project.client_name} ${project.name}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (statusFilter !== "all" && project.status !== statusFilter) return false;
      return true;
    });
  }, [projects, searchTerm, statusFilter, showArchived]);

  const paginatedProjects = useMemo(() => {
    if (pageSize === 0) return filteredProjects;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return filteredProjects.slice(start, end);
  }, [filteredProjects, pageIndex, pageSize]);

  const pageCount = useMemo(() => {
    if (pageSize === 0) return 1;
    return Math.ceil(filteredProjects.length / pageSize);
  }, [filteredProjects, pageSize]);

  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => !p.archived);
    return {
      total: activeProjects.length,
      inProgress: activeProjects.filter(p => p.status === 'in-progress').length,
      completed: activeProjects.filter(p => p.status === 'completed').length,
      planning: activeProjects.filter(p => p.status === 'planning').length,
      overdue: activeProjects.filter(p => p.status === 'overdue').length,
    };
  }, [projects]);

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setProjectToEdit(null);
    }
  };

  const handleOpenAddDialog = () => {
    setProjectToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEditDialog = (project: Project) => {
    setProjectToEdit(project);
    setIsFormOpen(true);
  };

  const handleOpenDeleteAlert = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteAlertOpen(true);
  };

  const handleOpenAcceptanceDialog = (project: Project) => {
    setProjectToComplete(project);
    setIsAcceptanceOpen(true);
  };
  
  const handleViewDetails = (project: Project) => {
    setProjectForDetails(project);
    setIsDetailsOpen(true);
  };

  const handleConfirmCompletion = async (link: string) => {
    if (!projectToComplete) return;
    const { error } = await supabase
      .from('projects')
      .update({ status: 'completed', acceptance_link: link })
      .eq('id', projectToComplete.id);

    if (error) {
      showError("Lỗi khi hoàn thành dự án.");
    } else {
      showSuccess("Dự án đã được hoàn thành!");
      
      supabase.functions.invoke('send-acceptance-notification', {
        body: {
          projectName: projectToComplete.name,
          clientName: projectToComplete.client_name,
          acceptanceLink: link,
        },
      }).then(({ error }) => {
        if (error) {
          console.error("Error sending notification:", error);
        }
      });
    }
    
    invalidateProjects();
    setIsAcceptanceOpen(false);
    setProjectToComplete(null);
  };

  const handleSaveProject = async (projectData: any) => {
    const saveData: any = {
      ...projectData,
      contract_value: Number(projectData.contract_value || 0),
    };

    if (projectToEdit) {
      const { error } = await supabase.from('projects').update(saveData).eq('id', projectToEdit.id);
      if (error) {
        showError("Lỗi khi cập nhật dự án.");
        console.error("Update project error:", error);
      } else {
        showSuccess("Dự án đã được cập nhật!");
      }
    } else {
      if (!session?.user) {
        showError("Bạn phải đăng nhập để tạo dự án.");
        return;
      }
      saveData.created_by = session.user.id;

      const { error } = await supabase.from('projects').insert([saveData]);
      if (error) {
        showError("Lỗi khi thêm dự án mới.");
        console.error("Insert project error:", error);
      } else {
        showSuccess("Dự án mới đã được thêm!");
      }
    }
    invalidateProjects();
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id);
    if (error) showError("Lỗi khi xóa dự án.");
    else showSuccess("Dự án đã được xóa.");
    invalidateProjects();
    setIsDeleteAlertOpen(false);
    setProjectToDelete(null);
  };

  const handleTogglePaymentStatus = async (projectId: string, paymentIndex: number) => {
    const originalProjects = [...projects];

    const updatedProjects = projects.map(p => {
      if (p.id === projectId) {
        const newPayments = [...p.payments];
        newPayments[paymentIndex] = {
          ...newPayments[paymentIndex],
          paid: !newPayments[paymentIndex].paid,
        };
        return { ...p, payments: newPayments };
      }
      return p;
    });
    setProjects(updatedProjects);

    const projectToUpdate = updatedProjects.find(p => p.id === projectId);
    if (!projectToUpdate) return;

    const { error } = await supabase
      .from('projects')
      .update({ payments: projectToUpdate.payments })
      .eq('id', projectId);

    if (error) {
      showError("Lỗi khi cập nhật thanh toán.");
      setProjects(originalProjects);
    } else {
      invalidateProjects();
    }
  };

  const handleSelectAll = (checked: boolean) => setSelectedProjects(checked ? filteredProjects.map((p) => p.id) : []);
  const handleSelectRow = (id: string, checked: boolean) => setSelectedProjects(checked ? [...selectedProjects, id] : selectedProjects.filter((pId) => pId !== id));
  
  const handleBulkArchive = async () => {
    const { error } = await supabase.from('projects').update({ archived: true }).in('id', selectedProjects);
    if (error) showError("Lỗi khi lưu trữ dự án.");
    else {
      showSuccess(`${selectedProjects.length} dự án đã được lưu trữ.`);
      invalidateProjects();
      setSelectedProjects([]);
    }
  };

  const handleBulkRestore = async () => {
    const { error } = await supabase.from('projects').update({ archived: false }).in('id', selectedProjects);
    if (error) showError("Lỗi khi khôi phục dự án.");
    else {
      showSuccess(`${selectedProjects.length} dự án đã được khôi phục.`);
      invalidateProjects();
      setSelectedProjects([]);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    const { error } = await supabase.from('projects').delete().in('id', selectedProjects);
    if (error) showError("Lỗi khi xóa dự án.");
    else {
      showSuccess(`${selectedProjects.length} dự án đã được xóa vĩnh viễn.`);
      invalidateProjects();
      setSelectedProjects([]);
    }
    setIsBulkDeleteAlertOpen(false);
  };

  const handleStatusFilterClick = (status: string) => updateSearchParam("status", statusFilter === status ? "all" : status);

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleDateString('vi-VN') : 'N/A';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quản lý Dự án</h1>
            <p className="text-muted-foreground">Theo dõi, quản lý và phân tích tất cả các dự án của bạn.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <ProjectStatsCard title="Tổng dự án" value={stats.total} description="Dự án đang hoạt động" icon={Folder} onClick={() => handleStatusFilterClick("all")} isActive={statusFilter === "all"} iconBgColor="bg-blue-500" />
          <ProjectStatsCard title="Đang chạy" value={stats.inProgress} description="Dự án đang triển khai" icon={Clock} onClick={() => handleStatusFilterClick("in-progress")} isActive={statusFilter === "in-progress"} iconBgColor="bg-cyan-500" />
          <ProjectStatsCard title="Hoàn thành" value={stats.completed} description="Dự án đã kết thúc" icon={CheckCircle} onClick={() => handleStatusFilterClick("completed")} isActive={statusFilter === "completed"} iconBgColor="bg-green-500" />
          <ProjectStatsCard title="Pending" value={stats.planning} description="Dự án đang lên kế hoạch" icon={AlertTriangle} onClick={() => handleStatusFilterClick("planning")} isActive={statusFilter === "planning"} iconBgColor="bg-amber-500" />
          <ProjectStatsCard title="Quá hạn" value={stats.overdue} description="Dự án trễ deadline" icon={XCircle} onClick={() => handleStatusFilterClick("overdue")} isActive={statusFilter === "overdue"} iconBgColor="bg-red-500" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 flex-1 w-full">
            <div className="relative w-full md:w-auto md:flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Tìm kiếm dự án..." className="pl-8 w-full" value={searchTerm} onChange={(e) => updateSearchParam('search', e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={(value) => updateSearchParam('status', value)}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Tiến độ" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả tiến độ</SelectItem><SelectItem value="planning">Pending</SelectItem><SelectItem value="in-progress">Đang chạy</SelectItem><SelectItem value="completed">Hoàn thành</SelectItem><SelectItem value="overdue">Quá hạn</SelectItem></SelectContent></Select>
            <Button variant="outline" onClick={() => updateSearchParam('archived', !showArchived)}>{showArchived ? <List className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}{showArchived ? "Dự án hoạt động" : "Dự án lưu trữ"}</Button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {selectedProjects.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="destructive">Thao tác hàng loạt ({selectedProjects.length})</Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  {showArchived ? (<DropdownMenuItem onClick={handleBulkRestore}><RotateCcw className="mr-2 h-4 w-4" /> Khôi phục</DropdownMenuItem>) : (<DropdownMenuItem onClick={handleBulkArchive}><Archive className="mr-2 h-4 w-4" /> Lưu trữ</DropdownMenuItem>)}
                  <DropdownMenuItem onClick={() => setIsBulkDeleteAlertOpen(true)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" /> Xóa</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button onClick={handleOpenAddDialog}><PlusCircle className="mr-2 h-4 w-4" /> Thêm dự án</Button>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-4">
            {isLoading ? <p>Đang tải...</p> : paginatedProjects.map(project => (
              <ProjectCardMobile key={project.id} project={project} onViewDetails={handleViewDetails} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] px-2"><Checkbox checked={selectedProjects.length === filteredProjects.length && filteredProjects.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Tên dự án</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Nhân sự</TableHead>
                      <TableHead>Giá trị HĐ</TableHead>
                      <TableHead>Đã thanh toán</TableHead>
                      <TableHead>Công nợ</TableHead>
                      <TableHead>Tiến độ TT</TableHead>
                      <TableHead>Nghiệm thu</TableHead>
                      <TableHead>Tiến độ</TableHead>
                      <TableHead className="text-right w-[80px] px-2">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? <TableRow><TableCell colSpan={13} className="text-center">Đang tải...</TableCell></TableRow> :
                    paginatedProjects.map(project => {
                      const totalPaid = (project.payments || []).filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
                      const debt = project.contract_value - totalPaid;
                      const isOverdue = project.status === 'overdue';
                      const overdueDays = isOverdue && project.end_date ? differenceInDays(new Date(), new Date(project.end_date)) : 0;

                      return (
                      <TableRow key={project.id} className="text-xs">
                        <TableCell className="px-2"><Checkbox checked={selectedProjects.includes(project.id)} onCheckedChange={(checked) => handleSelectRow(project.id, !!checked)} /></TableCell>
                        <TableCell><Link to={`/clients/${project.client_id}`} target="_blank" className="hover:underline">{project.client_name}</Link></TableCell>
                        <TableCell className="font-medium"><button onClick={() => handleViewDetails(project)} className="hover:underline text-left">{project.name}</button></TableCell>
                        <TableCell><a href={project.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"><ExternalLink className="h-4 w-4" /></a></TableCell>
                        <TableCell className={cn(isOverdue && "text-red-600")}>
                          <div><span className="font-bold">Bắt đầu:</span> {formatDate(project.start_date)}</div>
                          <div><span className="font-bold">Kết thúc:</span> {formatDate(project.end_date)}</div>
                          {isOverdue && (
                            <div className="flex items-center font-bold mt-1">
                              <AlertCircleIcon className="h-4 w-4 mr-1" />
                              <span>Trễ {overdueDays} ngày</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {(project.team || []).map((member, index) => (
                              <div key={index}>{member.role}: {member.name}</div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(project.contract_value)}</TableCell>
                        <TableCell className="text-green-600 font-medium">{formatCurrency(totalPaid)}</TableCell>
                        <TableCell className={cn(debt > 0 ? "text-red-600" : "text-green-600")}>{formatCurrency(debt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {(project.payments || []).map((payment, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span>{formatCurrency(payment.amount)}</span>
                                <CheckCircle className={cn("h-4 w-4 cursor-pointer", payment.paid ? "text-green-500" : "text-gray-300 hover:text-gray-400")} onClick={() => handleTogglePaymentStatus(project.id, index)} />
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.acceptance_link ? (
                            <a href={project.acceptance_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"><ExternalLink className="h-4 w-4" /></a>
                          ) : (
                            <span>N/A</span>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={cn({"bg-cyan-100 text-cyan-800 border-cyan-200": project.status === "in-progress", "bg-green-100 text-green-800 border-green-200": project.status === "completed", "bg-amber-100 text-amber-800 border-amber-200": project.status === "planning", "bg-red-100 text-red-800 border-red-200": project.status === "overdue"})}>{statusTextMap[project.status]}</Badge></TableCell>
                        <TableCell className="text-right px-2">
                          <div className="flex items-center justify-end gap-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-100" onClick={() => handleOpenAcceptanceDialog(project)}>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100" onClick={() => handleOpenEditDialog(project)}>
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100" onClick={() => handleOpenDeleteAlert(project)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-end space-x-2 p-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  {selectedProjects.length} của {filteredProjects.length} dòng được chọn.
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
            </CardContent>
          </Card>
        )}
      </div>
      <ProjectFormDialog open={isFormOpen} onOpenChange={handleFormOpenChange} onSave={handleSaveProject} project={projectToEdit} clients={clients} />
      <AcceptanceDialog open={isAcceptanceOpen} onOpenChange={setIsAcceptanceOpen} onConfirm={handleConfirmCompletion} />
      <ProjectDetailsDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen} project={projectForDetails} />
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác. Dự án "{projectToDelete?.name}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm}>Xóa</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác. Thao tác này sẽ xóa vĩnh viễn {selectedProjects.length} dự án đã chọn.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleBulkDeleteConfirm}>Xóa</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default ProjectsPage;