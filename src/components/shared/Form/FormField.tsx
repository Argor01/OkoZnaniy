import React from 'react';
import { Field } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  required = false,
  placeholder,
}: FormFieldProps) => {
  return (
    <div className="mb-4">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      <Field name={name}>
        {({ field, meta }: any) => (
          <>
            {type === 'textarea' ? (
              <textarea
                id={name}
                {...field}
                rows={4}
                placeholder={placeholder}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            ) : (
              <Input id={name} {...field} type={type} placeholder={placeholder} />
            )}
            {meta.touched && meta.error ? (
              <p className="mt-1 text-sm text-red-500">{meta.error}</p>
            ) : null}
          </>
        )}
      </Field>
    </div>
  );
};