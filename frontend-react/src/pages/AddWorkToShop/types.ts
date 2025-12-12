export interface WorkFormData {
  title: string;
  price: number;
  type: string;
  subject: string;
  language: string;
  description: string;
  tableOfContents: string;
  bibliography: string;
}

export interface WorkFormProps {
  onSave: (data: WorkFormData) => void;
  onCancel: () => void;
}
