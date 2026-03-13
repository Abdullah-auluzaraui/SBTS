import React from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import { Shield, School, Users, BarChart3 } from 'lucide-react';

// Task FE-S1-8: SuperAdminDashboard (Stub) — v2.0
const SuperAdminDashboard = () => {
    const { user } = useAuth();

    return (
        <MainLayout>
            <div className="bg-white border text-right border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-10">

                {/* Welcome Message */}
                <div className="mb-8 flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm">
                        <Shield size={32} strokeWidth={1.75} className="text-indigo-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">
                            أهلاً بك، <span className="bg-gradient-to-l from-indigo-600 to-indigo-400 bg-clip-text text-transparent">{user?.name}</span>
                        </h2>
                        <p className="text-gray-500 mt-1">مدير النظام العام (Super Admin)</p>
                    </div>
                </div>

                {/* Navigation Placeholder */}
                <div className="flex flex-wrap gap-4 pb-8 mb-8 border-b border-gray-100">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">
                        <School size={18} strokeWidth={2} className="text-gray-500" /> المدارس
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">
                        <Users size={18} strokeWidth={2} className="text-gray-500" /> مدراء المدارس
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">
                        <BarChart3 size={18} strokeWidth={2} className="text-gray-500" /> إحصائيات عامة
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-gray-600 font-bold text-lg z-10 relative">المدارس المسجلة</div>
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center z-10 relative">
                                <School size={20} strokeWidth={2} className="text-indigo-600" />
                            </div>
                        </div>
                        <div className="text-5xl font-bold text-indigo-600 z-10 relative">—</div>
                        <p className="text-sm text-gray-400 mt-2">سيتم التفعيل في Sprint 2</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-gray-600 font-bold text-lg z-10 relative">إجمالي الطلاب</div>
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center z-10 relative">
                                <Users size={20} strokeWidth={2} className="text-purple-600" />
                            </div>
                        </div>
                        <div className="text-5xl font-bold text-purple-600 z-10 relative">—</div>
                        <p className="text-sm text-gray-400 mt-2">سيتم التفعيل في Sprint 2</p>
                    </div>

                    <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-gray-600 font-bold text-lg z-10 relative">إجمالي الحافلات</div>
                            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center z-10 relative">
                                <BarChart3 size={20} strokeWidth={2} className="text-teal-600" />
                            </div>
                        </div>
                        <div className="text-5xl font-bold text-teal-600 z-10 relative">—</div>
                        <p className="text-sm text-gray-400 mt-2">سيتم التفعيل في Sprint 2</p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default SuperAdminDashboard;
