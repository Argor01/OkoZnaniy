export interface WorkFormData {
  title: string;
  description: string;
  price: number;
  subject: string;
  workType: string;
  preview?: File | null;
  files?: File[];
}

export interface WorkFormProps {
  onSave: (data: WorkFormData) => void;
  onCancel: () => void;
  subjects?: any[];
  workTypes?: any[];
}
