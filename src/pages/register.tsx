import React from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <div className="register-page min-h-screen flex flex-col items-center justify-center p-6 bg-smartcourse-auth relative">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="mb-6">
        <h1 className="text-white text-center font-display text-4xl md:text-5xl">Oko Znaniy</h1>
      </div>
      <RegisterForm />
    </div>
  );
};

export default RegisterPage;