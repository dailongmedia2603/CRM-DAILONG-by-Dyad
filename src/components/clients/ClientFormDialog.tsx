import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Client } from "@/types";
import { useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import usePersistentState from "@/hooks/usePersistentState";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (client: any) => void;
  client?: Client | null;
}

export const ClientFormDialog = ({
  open,
  onOpenChange,
  onSave,
  client,
}: ClientFormDialogProps) => {
  const [formData, setFormData] = usePersistentState<Partial<Client>>('clientFormData', {});
  const { personnel } = useSession();

  useEffect(() => {
    if (open) {
      const hasPersistedData = Object.keys(formData).length > 0;

      if (!hasPersistedData) {
        if (client) {
          setFormData(client);
        } else {
          const initialData: Partial<Client> = { 
            status: "active",
            creation_date: new Date().toISOString(),
            created_by: personnel?.name || "Admin"
          };
          setFormData(initialData);
        }
      }
    } else {
      setFormData({});
    }
  }, [client, open, personnel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id, profiles, folders, ...dataToSave } = formData;
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{client ? "Chỉnh sửa Client" : "Thêm Client mới"}</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết của client vào form bên dưới.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên Client</Label>
              <Input id="name" name="name" value={formData.name || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Người liên hệ</Label>
              <Input id="contact_person" name="contact_person" value={formData.contact_person || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_email">Mail hóa đơn</Label>
              <Input id="invoice_email" name="invoice_email" type="email" value={formData.invoice_email || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Ngành</Label>
              <Input id="industry" name="industry" value={formData.industry || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classification">Phân loại</Label>
              <Select value={formData.classification} onValueChange={(value) => handleSelectChange("classification", value)}>
                <SelectTrigger><SelectValue placeholder="Chọn phân loại" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cá nhân">Cá nhân</SelectItem>
                  <SelectItem value="Doanh nghiệp">Doanh nghiệp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Nguồn</Label>
              <Select value={formData.source} onValueChange={(value) => handleSelectChange("source", value)}>
                <SelectTrigger><SelectValue placeholder="Chọn nguồn" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Fanpage">Fanpage</SelectItem>
                  <SelectItem value="CTV Sale">CTV Sale</SelectItem>
                  <SelectItem value="Giới thiệu">Giới thiệu</SelectItem>
                  <SelectItem value="Seeding">Seeding</SelectItem>
                  <SelectItem value="Khác">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit">Lưu</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};