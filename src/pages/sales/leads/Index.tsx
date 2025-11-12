import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { 
  Eye,
  PenLine,
  PlusCircle,
  Search,
  Trash2,
  History,
  Users,
  Briefcase,
  AlertCircle,
  Clock,
  X,
  FileCheck,
  Archive,
  RotateCcw,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronsLeft,
  ChevronRight,
  ChevronsRight,
  ChevronLeft
} from "lucide-react";
import { LeadStatsCard } from "@/components/sales/leads/LeadStatsCard";
import { LeadHistoryDialog } from "@/components/sales/leads/LeadHistoryDialog";
import { LeadFormDialog } from "@/components/sales/leads/LeadFormDialog";
import { LeadDetailsDialog } from "@/components/sales/leads/LeadDetailsDialog";
import { showSuccess, showError } from "@/utils/toast";
import { Lead, Personnel } from "@/types";
import { cn } from "@/lib/utils";
import { format, startOfDay, isEqual, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { LeadCard } from "@/components/sales/leads/LeadCard";
import { useLeads } from "@/hooks/useLeads";

const LeadsPage = () => {
  const { personnel: currentUserPersonnel } = useSession();
  const { leads, personnel, isLoading, invalidateLeads } = useLeads();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchTerm = searchParams.get("search") || "";
  const salesFilter = searchParams.get("sales") || "all";
  const statusFilter = searchParams.get("status") || "all";
  const archivedFilter = searchParams.get("archived") || "active";
  const followUpFilter = searchParams.get("followUp") || "all";
  const specificDateFilter = searchParams.get("date") ? parseISO(searchParams.get("date")!) : undefined;
  const pageIndex = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [formDialogOpen, setFormDialogOpen] = useState(() => sessionStorage.getItem('leadFormOpen') === 'true');
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(() => {
    const saved = sessionStorage.getItem('leadToEdit');
    return saved ? JSON.parse(saved) : null;
  });

  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const isMobile = useIsMobile();

  const updateSearchParam = (key: string, value: string | boolean | number) => {
    setSearchParams(prev => {
      const defaults: Record<string, any> = {
        search: '',
        sales: 'all',
        status: 'all',
        archived: 'active',
        followUp: 'all',
        date: undefined,
        page: 0,
        pageSize: 20,
      };
      if (value === defaults[key] || !value) {
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

  const currentUserInfo = useMemo(() => {
    if (currentUserPersonnel) {
      return { 
        id: currentUserPersonnel.id, 
        name: currentUserPersonnel.name, 
        isSale: currentUserPersonnel.position.toLowerCase() === 'sale',
        role: currentUserPersonnel.role 
      };
    }
    return { id: '', name: '', isSale: false, role: null };
  }, [currentUserPersonnel]);

  const assignableUsers = useMemo(() => {
    const sales = personnel.filter(p => p.position.toLowerCase() === 'sale');
    const salesIds = new Set(sales.map(p => p.id));

    if (currentUserInfo.id && (currentUserInfo.role === 'BOD' || currentUserInfo.role === 'Quản lý') && !salesIds.has(currentUserInfo.id)) {
        const adminUser = personnel.find(p => p.id === currentUserInfo.id);
        if (adminUser) {
            return [...sales, adminUser];
        }
    }
    return sales;
  }, [personnel, currentUserInfo]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const isArchivedMatch = archivedFilter === 'all' || (archivedFilter === 'active' ? !lead.archived : lead.archived);
      const isSalesMatch = salesFilter === 'all' || lead.created_by_id === salesFilter;
      const isStatusMatch = statusFilter === 'all' || lead.status === statusFilter;
      const isSearchMatch = searchTerm === '' || 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone && lead.phone.includes(searchTerm)) ||
        lead.product.toLowerCase().includes(searchTerm.toLowerCase());
      
      let isFollowUpMatch = true;
      if (followUpFilter !== 'all' || specificDateFilter) {
        const today = startOfDay(new Date());
        const latestHistory = lead.lead_history?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        if (!latestHistory || !latestHistory.next_follow_up_date) {
          isFollowUpMatch = false;
        } else {
          const followUpDate = startOfDay(new Date(latestHistory.next_follow_up_date));
          if (specificDateFilter) {
            isFollowUpMatch = isEqual(followUpDate, startOfDay(specificDateFilter));
          } else if (followUpFilter === 'today') {
            isFollowUpMatch = isEqual(followUpDate, today);
          } else if (followUpFilter === 'overdue') {
            isFollowUpMatch = followUpDate < today;
          }
        }
      }

      return isArchivedMatch && isSalesMatch && isStatusMatch && isSearchMatch && isFollowUpMatch;
    });
  }, [leads, searchTerm, salesFilter, statusFilter, archivedFilter, followUpFilter, specificDateFilter]);

  const paginatedLeads = useMemo(() => {
    if (pageSize === 0) return filteredLeads;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return filteredLeads.slice(start, end);
  }, [filteredLeads, pageIndex, pageSize]);

  const pageCount = useMemo(() => {
    if (pageSize === 0) return 1;
    return Math.ceil(filteredLeads.length / pageSize);
  }, [filteredLeads, pageSize]);

  const stats = useMemo(() => ({
    totalLeads: filteredLeads.length,
    contractValue: filteredLeads.filter(lead => lead.result === "ký hợp đồng").length,
    potentialLeads: filteredLeads.filter(lead => lead.potential === "tiềm năng").length,
    thinking: filteredLeads.filter(lead => lead.status === "đang suy nghĩ").length,
    working: filteredLeads.filter(lead => lead.status === "đang làm việc").length,
    silent: filteredLeads.filter(lead => lead.status === "im ru").length,
    rejected: filteredLeads.filter(lead => lead.status === "từ chối").length
  }), [filteredLeads]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedLeads(checked ? filteredLeads.map(lead => lead.id) : []);
  };

  const handleSelectLead = (id: string) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]);
  };

  const handleBulkAction = async (action: 'archive' | 'restore' | 'delete') => {
    if (selectedLeads.length === 0) return showError("Vui lòng chọn ít nhất một lead.");
    
    if (action === 'delete') {
        const { error } = await supabase.from('leads').delete().in('id', selectedLeads);
        if (error) showError("Lỗi khi xóa leads.");
        else showSuccess(`Đã xóa ${selectedLeads.length} lead.`);
    } else {
        const archiveStatus = action === 'archive';
        const { error } = await supabase.from('leads').update({ archived: archiveStatus }).in('id', selectedLeads);
        if (error) showError(`Lỗi khi ${archiveStatus ? 'lưu trữ' : 'khôi phục'} leads.`);
        else showSuccess(`Đã ${archiveStatus ? 'lưu trữ' : 'khôi phục'} ${selectedLeads.length} lead.`);
    }
    
    invalidateLeads();
    setSelectedLeads([]);
    setSelectAll(false);
  };

  const handleOpenHistory = (lead: Lead) => {
    setSelectedLead(lead);
    setHistoryDialogOpen(true);
  };

  const handleOpenDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsDialogOpen(true);
  };

  const handleAddHistory = async (leadId: string, newHistoryData: any) => {
    const { error } = await supabase.from('lead_history').insert([{ lead_id: leadId, ...newHistoryData }]);
    if (error) {
      showError("Lỗi khi thêm lịch sử chăm sóc.");
      console.error(error);
    }
    else {
        showSuccess("Đã thêm lịch sử chăm sóc.");
        invalidateLeads();
    }
  };

  const handleSetFormOpen = (open: boolean) => {
    setFormDialogOpen(open);
    if (open) {
      sessionStorage.setItem('leadFormOpen', 'true');
    } else {
      sessionStorage.removeItem('leadFormOpen');
      sessionStorage.removeItem('leadToEdit');
      sessionStorage.removeItem('leadFormData');
    }
  };

  const handleOpenAddDialog = () => {
    setLeadToEdit(null);
    sessionStorage.removeItem('leadToEdit');
    handleSetFormOpen(true);
  };

  const handleOpenEditDialog = (lead: Lead) => {
    setLeadToEdit(lead);
    sessionStorage.setItem('leadToEdit', JSON.stringify(lead));
    handleSetFormOpen(true);
  };

  const handleOpenDeleteAlert = (lead: Lead) => { setLeadToDelete(lead); setDeleteAlertOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    const { error } = await supabase.from('leads').delete().eq('id', leadToDelete.id);
    if (error) showError("Lỗi khi xóa lead.");
    else showSuccess("Đã xóa lead thành công.");
    invalidateLeads();
    setDeleteAlertOpen(false);
    setLeadToDelete(null);
  };

  const handleSaveLead = async (leadData: any) => {
    if (leadToEdit) {
      const { error } = await supabase.from('leads').update(leadData).eq('id', leadToEdit.id);
      if (error) showError("Lỗi khi cập nhật lead.");
      else showSuccess("Đã cập nhật lead thành công.");
    } else {
      const { error } = await supabase.from('leads').insert([leadData]);
      if (error) showError("Lỗi khi thêm lead mới.");
      else showSuccess("Đã thêm lead mới thành công.");
    }
    invalidateLeads();
    handleSetFormOpen(false);
    setLeadToEdit(null);
  };

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd/MM/yyyy");
  };

  const handleFollowUpFilterChange = (value: string) => {
    setSearchParams(prev => {
      if (value === 'all') {
        prev.delete('followUp');
      } else {
        prev.set('followUp', value);
      }
      prev.delete('date');
      return prev;
    }, { replace: true });
  };

  const handleSpecificDateSelect = (date?: Date) => {
    setSearchParams(prev => {
      prev.delete('followUp');
      if (date) {
        prev.set('date', format(date, 'yyyy-MM-dd'));
      } else {
        prev.delete('date');
      }
      return prev;
    }, { replace: true });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý Lead</h1>
          <p className="text-muted-foreground">Quản lý và theo dõi các lead tiềm năng</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <LeadStatsCard title="Tổng Lead" value={stats.totalLeads.toString()} icon={Users} />
          <LeadStatsCard title="Giá trị hợp đồng" value={stats.contractValue.toString()} icon={FileCheck} variant="success" />
          <LeadStatsCard title="Lead tiềm năng" value={stats.potentialLeads.toString()} icon={Briefcase} variant="primary" />
          <LeadStatsCard title="Đang suy nghĩ" value={stats.thinking.toString()} icon={AlertCircle} variant="warning" />
          <LeadStatsCard title="Đang làm việc" value={stats.working.toString()} icon={Clock} variant="info" />
          <LeadStatsCard title="Im ru" value={stats.silent.toString()} icon={X} variant="secondary" />
          <LeadStatsCard title="Từ chối" value={stats.rejected.toString()} icon={X} variant="destructive" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <div className="relative flex-grow"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Tìm kiếm..." className="pl-8" value={searchTerm} onChange={(e) => updateSearchParam('search', e.target.value)} /></div>
          <div className="flex w-full md:w-auto space-x-4">
            <Select value={salesFilter} onValueChange={(value) => updateSearchParam('sales', value)}><SelectTrigger className="w-full"><SelectValue placeholder="Nhân viên sale" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả nhân viên</SelectItem>{assignableUsers.map((person) => (<SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>))}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={(value) => updateSearchParam('status', value)}><SelectTrigger className="w-full"><SelectValue placeholder="Trạng thái chăm sóc" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem><SelectItem value="đang làm việc">Đang làm việc</SelectItem><SelectItem value="đang suy nghĩ">Đang suy nghĩ</SelectItem><SelectItem value="im ru">Im ru</SelectItem><SelectItem value="từ chối">Từ chối</SelectItem></SelectContent></Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  Cần chăm sóc <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => handleFollowUpFilterChange('all')}>Tất cả</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleFollowUpFilterChange('today')}>Hôm nay</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleFollowUpFilterChange('overdue')}>Quá hạn</DropdownMenuItem>
                <DropdownMenuSeparator />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start">Chọn ngày</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={specificDateFilter} onSelect={handleSpecificDateSelect} initialFocus />
                  </PopoverContent>
                </Popover>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleOpenAddDialog} className="whitespace-nowrap"><PlusCircle className="h-4 w-4 mr-2" />Thêm Lead</Button>
          </div>
        </div>
        
        <div className="flex justify-start items-center">
          <div className="flex space-x-2">{selectedLeads.length > 0 && (<><Button variant="outline" onClick={() => handleBulkAction(archivedFilter === 'active' ? 'archive' : 'restore')}><Archive className="h-4 w-4 mr-2" />{archivedFilter === 'active' ? 'Lưu trữ' : 'Khôi phục'} ({selectedLeads.length})</Button><Button variant="destructive" onClick={() => handleBulkAction('delete')}><Trash2 className="h-4 w-4 mr-2" />Xóa ({selectedLeads.length})</Button></>)}</div>
        </div>
        
        {isMobile ? (
          <div className="space-y-4">
            {isLoading ? <p>Đang tải...</p> : paginatedLeads.map(lead => (
              <LeadCard key={lead.id} lead={lead} onViewDetails={handleOpenDetails} />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-2"><CardTitle>Danh sách Lead</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-12"><Checkbox checked={selectAll} onCheckedChange={handleSelectAll} /></TableHead><TableHead>Tên Lead</TableHead><TableHead>SĐT</TableHead><TableHead>Sản phẩm</TableHead><TableHead>Lịch sử</TableHead><TableHead>Sale</TableHead><TableHead>Ngày tạo</TableHead><TableHead>Tiềm năng</TableHead><TableHead>Trạng thái</TableHead><TableHead>Kết quả</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? <TableRow><TableCell colSpan={11} className="text-center h-24">Đang tải...</TableCell></TableRow> :
                    paginatedLeads.length === 0 ? (<TableRow><TableCell colSpan={11} className="text-center h-24">Không tìm thấy lead nào</TableCell></TableRow>) : (
                      paginatedLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell><Checkbox checked={selectedLeads.includes(lead.id)} onCheckedChange={() => handleSelectLead(lead.id)} /></TableCell>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.phone}</TableCell>
                          <TableCell>{lead.product}</TableCell>
                          <TableCell><Button variant="outline" size="sm" onClick={() => handleOpenHistory(lead)}><History className="h-4 w-4 mr-1" />({lead.lead_history?.length || 0})</Button></TableCell>
                          <TableCell>{lead.created_by_name || 'N/A'}</TableCell>
                          <TableCell>{formatDateDisplay(lead.created_at)}</TableCell>
                          <TableCell><Badge className={cn("capitalize", lead.potential === "tiềm năng" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}>{lead.potential}</Badge></TableCell>
                          <TableCell><Badge className={cn("capitalize", lead.status === "đang làm việc" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800")}>{lead.status}</Badge></TableCell>
                          <TableCell><Badge className={cn("capitalize", lead.result === "ký hợp đồng" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800")}>{lead.result}</Badge></TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100" onClick={() => handleOpenDetails(lead)}>
                                      <Eye className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Xem chi tiết</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-100" onClick={() => handleOpenEditDialog(lead)}>
                                      <PenLine className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Sửa</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100" onClick={() => handleOpenDeleteAlert(lead)}>
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Xóa</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  {selectedLeads.length} của {filteredLeads.length} dòng được chọn.
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
      
      {selectedLead && <LeadHistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} leadName={selectedLead.name} leadId={selectedLead.id} history={selectedLead.lead_history} onAddHistory={handleAddHistory} />}
      {selectedLead && <LeadDetailsDialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} lead={selectedLead} />}
      <LeadFormDialog open={formDialogOpen} onOpenChange={handleSetFormOpen} onSave={handleSaveLead} salesPersons={assignableUsers} lead={leadToEdit} currentUser={currentUserInfo} />
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác. Lead "{leadToDelete?.name}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default LeadsPage;