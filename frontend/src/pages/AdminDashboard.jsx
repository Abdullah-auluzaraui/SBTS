import React from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import { MapPin, Bus, GraduationCap, ClipboardList, User } from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuth();

    return (
        <MainLayout>
            <div className="bg-white border text-right border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-10">

                {/* Welcome Message */}
                <div className="mb-8 flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center shadow-sm">
                        <User size={32} strokeWidth={1.75} className="text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">
                            أهلاً بك، <span className="bg-gradient-to-l from-primary-600 to-primary-400 bg-clip-text text-transparent">{user?.name}</span>
                        </h2>
                        <p className="text-gray-500 mt-1">مدير النظام</p>
                    </div>
                </div>

                {/* Sidebar / Top Navigation Placeholder */}
                <div className="flex flex-wrap gap-4 pb-8 mb-8 border-b border-gray-100">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-primary-50 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm">
                        <MapPin size={18} strokeWidth={2} className="text-gray-500 group-hover:text-primary-500" /> بالطرق
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-primary-50 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm">
                        <Bus size={18} strokeWidth={2} className="text-gray-500" /> الحافلات
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-primary-50 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm">
                        <GraduationCap size={18} strokeWidth={2} className="text-gray-500" /> الطلاب
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-primary-50 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm">
                        <ClipboardList size={18} strokeWidth={2} className="text-gray-500" /> الحضور
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-gray-600 font-bold text-lg z-10 relative">الطرق النشطة</div>
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center z-10 relative">
                                <MapPin size={20} strokeWidth={2} className="text-blue-600" />
                            </div>
                        </div>
                        <div className="text-5xl font-bold text-blue-600 z-10 relative">3</div>
                    </div>

                    <div className="bg-gradient-to-br from-primary-50 to-white border border-primary-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-gray-600 font-bold text-lg z-10 relative">الحافلات النشطة</div>
                            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center z-10 relative">
                                <Bus size={20} strokeWidth={2} className="text-primary-600" />
                            </div>
                        </div>
                        <div className="text-5xl font-bold text-primary-600 z-10 relative">2</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-gray-600 font-bold text-lg z-10 relative">الطلاب المسجلين</div>
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center z-10 relative">
                                <GraduationCap size={20} strokeWidth={2} className="text-purple-600" />
                            </div>
                        </div>
                        <div className="text-5xl font-bold text-purple-600 z-10 relative">45</div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-gray-600 font-bold text-lg z-10 relative">سجلات اليوم</div>
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center z-10 relative">
                                <ClipboardList size={20} strokeWidth={2} className="text-orange-600" />
                            </div>
                        </div>
                        <div className="text-5xl font-bold text-orange-600 z-10 relative">87</div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default AdminDashboard;
