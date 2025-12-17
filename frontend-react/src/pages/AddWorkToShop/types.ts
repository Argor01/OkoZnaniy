export interface WorkFormData {
  title: string;
  price: number;
  type: string;
  subject: string;
  language: string;
  description: string;
  files?: any[];
  coverImage?: any;
  coverImagePreview?: string;
}

export interface WorkFormProps {
  onSave: (data: WorkFormData) => void;
  onCancel: () => void;
}
