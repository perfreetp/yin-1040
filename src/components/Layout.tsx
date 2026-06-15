import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Database, TrendingUp, Users, Truck, FlaskConical, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '首页' },
  { path: '/data-import', icon: Database, label: '数据接入' },
  { path: '/prediction', icon: TrendingUp, label: '预测' },
  { path: '/customer-collection', icon: Users, label: '客户回款' },
  { path: '/supplier-payment', icon: Truck, label: '供应商付款' },
  { path: '/scenario', icon: FlaskConical, label: '情景推演' },
  { path: '/alert', icon: Bell, label: '预警' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const unreadCount = 2;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`flex flex-col border-r border-navy-600/50 bg-navy-800 transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-[220px]'
        }`}
      >
        <div className="flex h-16 items-center border-b border-navy-600/50 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ice-500 to-ice-300">
                <TrendingUp className="h-4 w-4 text-navy-900" />
              </div>
              <span className="gradient-text text-lg font-bold tracking-tight">CashFlow AI</span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ice-500 to-ice-300">
              <TrendingUp className="h-4 w-4 text-navy-900" />
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-ice-500/10 text-ice-500'
                    : 'text-gray-400 hover:bg-navy-700 hover:text-gray-200'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <div className="relative">
                <item.icon className="h-5 w-5 shrink-0" />
                {item.path === '/alert' && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-navy-600/50 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg py-2 text-gray-500 transition-colors hover:bg-navy-700 hover:text-gray-300"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1440px] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
