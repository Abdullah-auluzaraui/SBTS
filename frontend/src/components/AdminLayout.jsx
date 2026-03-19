import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import MainLayout from './MainLayout';
import { LayoutDashboard, Bus, MapPin, GraduationCap, ClipboardList } from 'lucide-react';

const navItems = [
    { title: 'لوحة التحكم', icon: LayoutDashboard, path: '/admin' },
    { title: 'الحافلات', icon: Bus, path: '/admin/buses' },
    { title: 'المسارات', icon: MapPin, path: '/admin/routes' },
    { title: 'الطلاب', icon: GraduationCap, path: '/admin/students' },
    { title: 'الحضور', icon: ClipboardList, path: '/admin/attendance' },
];

const AdminLayout = () => {
    return (
        <MainLayout>
            <div className="bg-white border text-right border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-10">
                {/* Tab Navigation */}
                <nav className="flex flex-wrap gap-2 pb-6 mb-6 border-b border-gray-100">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800 border border-gray-100'
                                }`
                            }
                        >
                            <item.icon size={16} strokeWidth={2} />
                            {item.title}
                        </NavLink>
                    ))}
                </nav>

                {/* Page Content */}
                <Outlet />
            </div>
        </MainLayout>
    );
};

export default AdminLayout;
