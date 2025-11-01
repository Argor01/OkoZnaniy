import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-smartcourse-auth relative">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="mb-6">
        <h1 className="text-slate-200 text-center font-display text-4xl md:text-5xl">SmartCourse</h1>
        <div className="text-slate-300 -mt-2 text-center">Войдите в свой аккаунт</div>
      </div>
      <LoginForm />
    </div>
  );
};

export default LoginPage;