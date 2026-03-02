import React from 'react';
import MainLayout from './MainLayout';

const DashboardSkeleton = () => {
    return (
        <MainLayout>
            <div className="animate-pulse space-y-6 max-w-4xl mx-auto p-6 lg:p-10">
                {/* Header Skeleton */}
                <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                    <div className="w-16 h-16 bg-gray-200 rounded-2xl shadow-sm"></div>
                    <div className="space-y-3 flex-1">
                        <div className="h-6 bg-gray-200 rounded-md w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded-md w-1/4"></div>
                    </div>
                </div>

                {/* Map/Hero Skeleton */}
                <div className="w-full h-[300px] bg-gray-200 rounded-2xl shadow-sm mb-8"></div>

                {/* Grid Skeletons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="h-48 bg-gray-200 rounded-2xl shadow-sm"></div>
                    <div className="h-48 bg-gray-200 rounded-2xl shadow-sm"></div>
                </div>
            </div>
        </MainLayout>
    );
};

export default DashboardSkeleton;
