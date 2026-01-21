export interface WorkFormData {
  title: string;
  description: string;
  price: number;
  subject: string;
  workType: string;
  preview?: string;
  files?: Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
  }>;
}

export interface WorkFormProps {
  onSave: (data: WorkFormData) => void;
  onCancel: () => void;
  subjects?: any[];
  workTypes?: any[];
}
