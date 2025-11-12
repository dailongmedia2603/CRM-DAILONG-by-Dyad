import { useState, useMemo, useEffect, createElement } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project, Personnel, AwaitingPaymentProject } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { ProjectDetailsDialog } from "@/components/projects/ProjectDetailsDialog";
import { AcceptanceHistoryDialog } from "@/components/projects/AcceptanceHistoryDialog";
import { ExternalLink, History, Search, FileSignature, Send, Clock, CheckCircle, FileText, DollarSign, PlusCircle, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewAwaitingPaymentProjectDialog } from "@/components/projects/NewAwaitingPaymentProjectDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const acceptanceStatuses = {
  'Cần làm BBNT': { icon: FileSignature, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', iconBgColor: 'bg-blue-500' },
  'Chờ xác nhận file': { icon: Send, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', iconBgColor: 'bg-purple-500' },
  'Đang in bản cứng': { icon: FileText, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', iconBgColor: 'bg-indigo-500' },
  'Đã gởi bản cứng': { icon: Send, color: 'text-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', iconBgColor: 'bg-cyan-500' },
  'Chờ thanh toán': { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', iconBgColor: 'bg-amber-500' },
  'Đã nhận tiền': { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', iconBgColor: 'bg-green-500' },
};

const awaitingPaymentStatuses = {
    'Đang làm hợp đồng': { icon: FileText, color: 'text-blue-600' },
    'Chờ ký & thanh toán': { icon: Clock, color: 'text-amber-600' },
};

const StatusCard = ({ icon, title, value, iconBgColor, onClick, isActive }: { icon: React.ElementType, title: string, value: string, iconBgColor: string, onClick?: () => void, isActive?: boolean }) => {
  const Icon = icon;
  return (
    <Card
      onClick={onClick}
      className={cn(
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        isActive && `ring-2 ring-blue-500`
      )}
    >
      <CardContent className="p-4 flex items-center">
        <div className={cn("p-3 rounded-lg mr-4", iconBgColor)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const ProjectAcceptanceTable = ({ projects, openDialog, handleStatusChange }: { projects: Project[], openDialog: (name: 'details' | 'history', project: Project) => void, handleStatusChange: (projectId: string, status: string) => void }) => {
  if (projects.length === 0) {
    return <div className="text-center text-muted-foreground p-8">Không có dự án nào.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tên dự án</TableHead>
          <TableHead>Link nghiệm thu</TableHead>
          <TableHead>Giá trị HĐ</TableHead>
          <TableHead>Công nợ</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Lịch sử</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map(project => {
          const statusInfo = acceptanceStatuses[(project.acceptance_status || 'Cần làm BBNT') as keyof typeof acceptanceStatuses] || acceptanceStatuses['Cần làm BBNT'];
          const totalPaid = (project.payments || []).filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
          const debt = (project.contract_value || 0) - totalPaid;
          return (
            <TableRow key={project.id}>
              <TableCell>
                <Button variant="link" className="p-0 h-auto font-medium" onClick={() => openDialog('details', project)}>
                  {project.name}
                </Button>
              </TableCell>
              <TableCell>
                <a href={project.acceptance_link || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                  <ExternalLink className="h-4 w-4 mr-1" /> Xem
                </a>
              </TableCell>
              <TableCell>{formatCurrency(project.contract_value || 0)}</TableCell>
              <TableCell className={cn(debt > 0 ? "text-red-600 font-medium" : "")}>{formatCurrency(debt)}</TableCell>
              <TableCell>
                <Select
                  value={project.acceptance_status || 'Cần làm BBNT'}
                  onValueChange={(value) => handleStatusChange(project.id, value)}
                >
                  <SelectTrigger className={cn("w-[200px] border", statusInfo.bgColor, statusInfo.borderColor)}>
                    <SelectValue asChild>
                      <div className={cn("flex items-center gap-2", statusInfo.color)}>
                        {statusInfo.icon && createElement(statusInfo.icon, { className: "h-4 w-4" })}
                        <span>{project.acceptance_status || 'Cần làm BBNT'}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(acceptanceStatuses).map(([status, { icon, color }]) => (
                      <SelectItem key={status} value={status}>
                        <div className={cn("flex items-center gap-2", color)}>
                          {createElement(icon, { className: "h-4 w-4" })}
                          <span>{status}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDialog('history', project)}
                  className={cn(
                    project.acceptance_history && project.acceptance_history.length > 0 &&
                    "border-red-500 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 animate-pulse"
                  )}
                >
                  <History className="mr-2 h-4 w-4" /> Lịch sử ({project.acceptance_history?.length || 0})
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

const NewProjectsAwaitingPaymentTable = ({ projects, onEdit, onDelete, onStatusChange, selectedProjects, onSelectAll, onSelectRow }: { 
    projects: AwaitingPaymentProject[], 
    onEdit: (project: AwaitingPaymentProject) => void,
    onDelete: (project: AwaitingPaymentProject) => void,
    onStatusChange: (projectId: string, status: AwaitingPaymentProject['status']) => void,
    selectedProjects: string[],
    onSelectAll: (checked: boolean) => void,
    onSelectRow: (id: string, checked: boolean) => void,
}) => {
    if (projects.length === 0) {
      return <div className="text-center text-muted-foreground p-8">Không có dự án mới nào chờ thanh toán.</div>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"><Checkbox checked={selectedProjects.length === projects.length && projects.length > 0} onCheckedChange={(checked) => onSelectAll(!!checked)} /></TableHead>
            <TableHead>Tên dự án</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Giá trị HĐ</TableHead>
            <TableHead>Đợt 1</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map(project => {
            const statusInfo = awaitingPaymentStatuses[project.status || 'Đang làm hợp đồng'];
            return (
            <TableRow key={project.id}>
              <TableCell><Checkbox checked={selectedProjects.includes(project.id)} onCheckedChange={(checked) => onSelectRow(project.id, !!checked)} /></TableCell>
              <TableCell className="font-medium">{project.name}</TableCell>
              <TableCell>{project.client_name}</TableCell>
              <TableCell>{formatCurrency(project.contract_value || 0)}</TableCell>
              <TableCell>{formatCurrency(project.payment1_amount || 0)}</TableCell>
              <TableCell>
                <Select value={project.status} onValueChange={(value) => onStatusChange(project.id, value as AwaitingPaymentProject['status'])}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue asChild>
                            <div className={cn("flex items-center gap-2", statusInfo.color)}>
                                {createElement(statusInfo.icon, { className: "h-4 w-4" })}
                                <span>{project.status}</span>
                            </div>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(awaitingPaymentStatuses).map(([status, { icon, color }]) => (
                            <SelectItem key={status} value={status}>
                                <div className={cn("flex items-center gap-2", color)}>
                                    {createElement(icon, { className: "h-4 w-4" })}
                                    <span>{status}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(project)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(project)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    );
  };

const AcceptancePage = () => {
  const { personnel: currentUser } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newAwaitingPaymentProjects, setNewAwaitingPaymentProjects] = useState<AwaitingPaymentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all_except_paid");

  const [dialogs, setDialogs] = useState({
    details: false,
    history: false,
  });
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<AwaitingPaymentProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<AwaitingPaymentProject | null>(null);
  const [selectedAwaitingProjects, setSelectedAwaitingProjects] = useState<string[]>([]);

  const row1Keys = ['Cần làm BBNT', 'Chờ xác nhận file', 'Đang in bản cứng', 'Đã gởi bản cứng'];
  const row2Keys = ['Chờ thanh toán', 'Đã nhận tiền'];

  const filteredAcceptanceProjects = useMemo(() => {
    return projects.filter(project => {
      const searchMatch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let statusMatch = true;
      if (statusFilter === 'all_except_paid') {
        statusMatch = project.acceptance_status !== 'Đã nhận tiền';
      } else if (statusFilter !== 'all') {
        statusMatch = (project.acceptance_status || 'Cần làm BBNT') === statusFilter;
      }

      return searchMatch && statusMatch;
    });
  }, [projects, searchTerm, statusFilter]);

  const filteredNewAwaitingPaymentProjects = useMemo(() => {
    return newAwaitingPaymentProjects.filter(project => 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.client_name && project.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [newAwaitingPaymentProjects, searchTerm]);

  const acceptanceStats = useMemo(() => {
    const statusCounts = Object.keys(acceptanceStatuses).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<string, number>);

    let totalDebt = 0;

    projects.forEach(project => {
      const status = project.acceptance_status || 'Cần làm BBNT';
      if (status in statusCounts) {
        statusCounts[status]++;
      }
      const totalPaid = (project.payments || []).filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
      const debt = (project.contract_value || 0) - totalPaid;
      if (debt > 0 && project.acceptance_status !== 'Đã nhận tiền') {
        totalDebt += debt;
      }
    });
    return { ...statusCounts, totalDebt };
  }, [projects]);

  const fetchData = async () => {
    setIsLoading(true);
    const [acceptanceProjectsRes, newProjectsRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*, acceptance_history(*)')
        .not('acceptance_link', 'is', null)
        .order('created_at', { foreignTable: 'acceptance_history', ascending: false }),
      supabase
        .from('awaiting_payment_projects')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    if (acceptanceProjectsRes.error) showError("Lỗi khi tải dự án nghiệm thu.");
    else setProjects(acceptanceProjectsRes.data as any[]);

    if (newProjectsRes.error) {
      showError("Lỗi khi tải dự án mới chờ thanh toán.");
    } else {
      setNewAwaitingPaymentProjects(newProjectsRes.data as AwaitingPaymentProject[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openDialog = (name: keyof typeof dialogs, project: Project) => {
    setActiveProject(project);
    setDialogs(prev => ({ ...prev, [name]: true }));
  };

  const closeDialog = (name: keyof typeof dialogs) => {
    setDialogs(prev => ({ ...prev, [name]: false }));
    setActiveProject(null);
  };

  const handleStatusChange = async (projectId: string, status: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ acceptance_status: status })
      .eq('id', projectId);
    
    if (error) showError("Lỗi khi cập nhật trạng thái.");
    else {
      showSuccess("Đã cập nhật trạng thái.");
      fetchData();
    }
  };

  const handleAddHistory = async (content: string) => {
    if (!activeProject || !currentUser) return;

    const newHistoryEntry = {
      project_id: activeProject.id,
      user_id: currentUser.id,
      user_name: currentUser.name,
      content,
    };

    const { error } = await supabase
      .from('acceptance_history')
      .insert([newHistoryEntry])
      .select()
      .single();

    if (error) {
      showError("Lỗi khi thêm lịch sử.");
    } else {
      showSuccess("Đã thêm lịch sử.");
      fetchData();
      closeDialog('history');
    }
  };

  const handleSaveNewAwaitingPaymentProject = async (data: Partial<AwaitingPaymentProject>) => {
    const { id, ...saveData } = data;
    let error;
    if (id) {
      ({ error } = await supabase.from('awaiting_payment_projects').update(saveData).eq('id', id));
    } else {
      ({ error } = await supabase.from('awaiting_payment_projects').insert([saveData]));
    }

    if (error) {
        showError("Lỗi khi lưu dự án: " + error.message);
    } else {
        showSuccess("Đã lưu dự án thành công!");
        fetchData();
    }
    setIsNewProjectDialogOpen(false);
    setProjectToEdit(null);
  };

  const handleAwaitingStatusChange = async (projectId: string, status: AwaitingPaymentProject['status']) => {
    const { error } = await supabase.from('awaiting_payment_projects').update({ status }).eq('id', projectId);
    if (error) showError("Lỗi khi cập nhật trạng thái.");
    else {
        showSuccess("Đã cập nhật trạng thái.");
        fetchData();
    }
  };

  const handleDeleteAwaitingProject = async () => {
    if (!projectToDelete) return;
    const { error } = await supabase.from('awaiting_payment_projects').delete().eq('id', projectToDelete.id);
    if (error) showError("Lỗi khi xóa dự án.");
    else {
        showSuccess("Đã xóa dự án.");
        fetchData();
    }
    setProjectToDelete(null);
  };

  const handleBulkDeleteAwaitingProjects = async () => {
    const { error } = await supabase.from('awaiting_payment_projects').delete().in('id', selectedAwaitingProjects);
    if (error) showError("Lỗi khi xóa hàng loạt.");
    else {
        showSuccess(`Đã xóa ${selectedAwaitingProjects.length} dự án.`);
        fetchData();
    }
    setSelectedAwaitingProjects([]);
    setProjectToDelete(null); // Close dialog if open
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Nghiệm Thu & Thanh Toán</h1>
          <p className="text-muted-foreground">Theo dõi quá trình nghiệm thu và các dự án mới đang chờ thanh toán.</p>
        </div>

        <Tabs defaultValue="acceptance" className="w-full">
          <TabsList>
            <TabsTrigger value="acceptance" className="group data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 group-data-[state=active]:bg-blue-500">
                <FileSignature className="h-4 w-4 text-gray-600 group-data-[state=active]:text-white" />
              </span>
              Nghiệm thu dự án
            </TabsTrigger>
            <TabsTrigger value="new_awaiting_payment" className="group data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
              <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 group-data-[state=active]:bg-amber-500">
                <DollarSign className="h-4 w-4 text-gray-600 group-data-[state=active]:text-white" />
              </span>
              Dự án mới chờ thanh toán
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="acceptance" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {row1Keys.map(status => {
                  const statusInfo = acceptanceStatuses[status as keyof typeof acceptanceStatuses];
                  return (
                    <StatusCard
                      key={status}
                      title={status}
                      value={acceptanceStats[status]?.toString() || '0'}
                      icon={statusInfo.icon}
                      iconBgColor={statusInfo.iconBgColor}
                      onClick={() => setStatusFilter(status)}
                      isActive={statusFilter === status}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {row2Keys.map(status => {
                  const statusInfo = acceptanceStatuses[status as keyof typeof acceptanceStatuses];
                  return (
                    <StatusCard
                      key={status}
                      title={status}
                      value={acceptanceStats[status]?.toString() || '0'}
                      icon={statusInfo.icon}
                      iconBgColor={statusInfo.iconBgColor}
                      onClick={() => setStatusFilter(status)}
                      isActive={statusFilter === status}
                    />
                  );
                })}
                <StatusCard
                  title="Công nợ"
                  value={formatCurrency(acceptanceStats.totalDebt)}
                  icon={DollarSign}
                  iconBgColor="bg-red-500"
                />
              </div>

              <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle>Danh sách dự án ({filteredAcceptanceProjects.length})</CardTitle>
                  <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm dự án..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Lọc theo trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_except_paid">Tất cả (chưa xong)</SelectItem>
                        <SelectItem value="all">Tất cả dự án</SelectItem>
                        {Object.keys(acceptanceStatuses).map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? <div className="text-center p-8">Đang tải...</div> : <ProjectAcceptanceTable projects={filteredAcceptanceProjects} openDialog={openDialog} handleStatusChange={handleStatusChange} />}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="new_awaiting_payment" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Dự án mới đang chờ thanh toán ({filteredNewAwaitingPaymentProjects.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm dự án..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => { setProjectToEdit(null); setIsNewProjectDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm mới
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedAwaitingProjects.length > 0 && (
                    <div className="mb-4">
                        <Button variant="destructive" onClick={() => setProjectToDelete({ id: 'bulk' } as any)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa ({selectedAwaitingProjects.length})
                        </Button>
                    </div>
                )}
                {isLoading ? <div className="text-center p-8">Đang tải...</div> : <NewProjectsAwaitingPaymentTable 
                    projects={filteredNewAwaitingPaymentProjects} 
                    onEdit={(p) => { setProjectToEdit(p); setIsNewProjectDialogOpen(true); }}
                    onDelete={(p) => setProjectToDelete(p)}
                    onStatusChange={handleAwaitingStatusChange}
                    selectedProjects={selectedAwaitingProjects}
                    onSelectAll={(checked) => setSelectedAwaitingProjects(checked ? filteredNewAwaitingPaymentProjects.map(p => p.id) : [])}
                    onSelectRow={(id, checked) => setSelectedAwaitingProjects(prev => checked ? [...prev, id] : prev.filter(pId => pId !== id))}
                />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {activeProject && (
        <>
          <ProjectDetailsDialog
            open={dialogs.details}
            onOpenChange={() => closeDialog('details')}
            project={activeProject}
          />
          <AcceptanceHistoryDialog
            open={dialogs.history}
            onOpenChange={() => closeDialog('history')}
            projectName={activeProject.name}
            history={activeProject.acceptance_history || []}
            onAddHistory={handleAddHistory}
          />
        </>
      )}
      <NewAwaitingPaymentProjectDialog
        open={isNewProjectDialogOpen}
        onOpenChange={setIsNewProjectDialogOpen}
        onSave={handleSaveNewAwaitingPaymentProject}
        project={projectToEdit}
      />
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                <AlertDialogDescription>
                    {projectToDelete?.id === 'bulk' 
                        ? `Hành động này sẽ xóa vĩnh viễn ${selectedAwaitingProjects.length} dự án đã chọn.`
                        : `Hành động này sẽ xóa vĩnh viễn dự án "${projectToDelete?.name}".`}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={projectToDelete?.id === 'bulk' ? handleBulkDeleteAwaitingProjects : handleDeleteAwaitingProject} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default AcceptancePage;