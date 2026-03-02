import React from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import { Bus, Play, Map, Users, AlertTriangle } from 'lucide-react';

const DriverDashboard = () => {
    const { user } = useAuth();

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-10 overflow-hidden relative">

                {/* Background accent */}
                <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-primary-50/50 to-transparent"></div>

                {/* Header */}
                <div className="mb-8 border-b border-gray-100 pb-6 relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
                        <Bus size={32} strokeWidth={1.75} className="text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl text-gray-800 font-bold">لوحة تحكم السائق — {user?.name}</h2>
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-bold">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            رقم الحافلة: BUS-001
                        </div>
                    </div>
                </div>

                {/* Start Trip Section */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 mb-8 border-b border-gray-100 relative z-10">
                    <button className="w-full sm:w-auto px-8 py-4 bg-primary-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary-500/30 hover:bg-primary-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
                        <Play size={22} strokeWidth={2} className="text-white" />
                        بدء الرحلة
                    </button>
                    <div className="flex items-center gap-3 font-bold text-gray-700 text-lg bg-gray-50 px-6 py-4 border border-gray-100 rounded-xl w-full sm:w-auto justify-center">
                        <Map size={20} strokeWidth={2} className="text-gray-500" />
                        المسار: المنطقة الشمالية
                    </div>
                </div>

                {/* Students on Board */}
                <div className="mb-10 relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-gray-800">
                            الطلاب على متن الحافلة
                        </h3>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg font-bold">
                            0 / 12 طالب
                        </span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                        <Users size={40} strokeWidth={1.5} className="mb-3 text-gray-300" />
                        <p className="text-gray-500 font-medium text-lg">الرحلة لم تبدأ بعد. طلابك سيظهرون هنا.</p>
                    </div>
                </div>

                {/* Emergency Alert */}
                <div className="relative z-10 mt-6">
                    <button className="flex items-center justify-center gap-3 px-6 py-4 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all font-bold rounded-xl w-full border border-red-100 text-lg group">
                        <AlertTriangle size={22} strokeWidth={2} className="text-red-600 group-hover:text-white" />
                        تنبيه حالة طوارئ
                    </button>
                </div>
            </div>
        </MainLayout>
    );
};

export default DriverDashboard;
