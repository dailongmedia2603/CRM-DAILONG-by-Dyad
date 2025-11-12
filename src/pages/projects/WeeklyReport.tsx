import { useState, useMemo, useEffect } from "react";
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
import { Project, Personnel } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { ProjectDetailsDialog } from "@/components/projects/ProjectDetailsDialog";
import { WeeklyReportFormDialog } from "@/components/projects/WeeklyReportFormDialog";
import { WeeklyReportHistoryDialog } from "@/components/projects/WeeklyReportHistoryDialog";
import { FileText, History, Search } from "lucide-react";

const WeeklyReportPage = () => {
  const { personnel: currentUserPersonnel } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [dialogs, setDialogs] = useState({
    details: false,
    form: false,
    history: false,
  });

  const currentUser = useMemo(() => {
    return currentUserPersonnel;
  }, [currentUserPersonnel]);

  const filteredProjects = useMemo(() => {
    if (!searchTerm) {
      return projects;
    }
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const fetchData = async () => {
    setIsLoading(true);
    const [projectsRes, personnelRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*, weekly_reports(*)')
        .eq('status', 'in-progress')
        .order('created_at', { foreignTable: 'weekly_reports', ascending: false }),
      supabase.from('personnel').select('*')
    ]);

    if (projectsRes.error) {
      showError("Lỗi khi tải dự án.");
      console.error(projectsRes.error);
    } else {
      setProjects(projectsRes.data as any[]);
    }

    if (personnelRes.error) {
      showError("Lỗi khi tải danh sách nhân sự.");
    } else {
      setPersonnel(personnelRes.data);
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

  const handleSaveReport = async (report: { status: string; issues: string; requests: string }) => {
    if (!activeProject || !currentUser) {
      showError("Không thể lưu báo cáo.");
      return;
    }

    const { error } = await supabase.from('weekly_reports').insert([
      {
        project_id: activeProject.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        ...report,
      },
    ]);

    if (error) {
      showError("Lỗi khi lưu báo cáo: " + error.message);
    } else {
      showSuccess("Đã lưu báo cáo thành công!");
      fetchData(); // Refetch data
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo tuần</h1>
          <p className="text-muted-foreground">
            Cập nhật và xem lại báo cáo hàng tuần cho các dự án đang chạy.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách dự án đang chạy ({filteredProjects.length})</CardTitle>
            <div className="relative w-full md:max-w-xs mt-2 md:mt-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm dự án..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên dự án</TableHead>
                  <TableHead className="text-center">Báo cáo tuần</TableHead>
                  <TableHead className="text-center">Lịch sử báo cáo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                      Không có dự án nào phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map(project => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium"
                          onClick={() => openDialog('details', project)}
                        >
                          {project.name}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog('form', project)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Báo cáo
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog('history', project)}
                        >
                          <History className="mr-2 h-4 w-4" />
                          Xem lịch sử ({project.weekly_reports?.length || 0})
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {activeProject && (
        <>
          <ProjectDetailsDialog
            open={dialogs.details}
            onOpenChange={() => closeDialog('details')}
            project={activeProject}
          />
          <WeeklyReportFormDialog
            open={dialogs.form}
            onOpenChange={() => closeDialog('form')}
            projectName={activeProject.name}
            onSave={handleSaveReport}
          />
          <WeeklyReportHistoryDialog
            open={dialogs.history}
            onOpenChange={() => closeDialog('history')}
            projectName={activeProject.name}
            reports={activeProject.weekly_reports || []}
          />
        </>
      )}
    </MainLayout>
  );
};

export default WeeklyReportPage;