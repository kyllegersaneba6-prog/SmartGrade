import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';

const users = [
  { id: 'USR-8921', name: 'Dr. Elena Rodriguez', dept: 'Faculty of Science', role: 'DEAN OF STUDIES', roleColor: '#f5a623', dots: [true, true, true, true, false] },
  { id: 'USR-7734', name: 'Marcus Thorne', dept: 'IT Administration', role: 'SYSTEM ADMIN', roleColor: '#1a2233', dots: [true, true, true, true, false] },
  { id: 'USR-5502', name: 'Sarah Jenkins', dept: 'Admissions Office', role: 'REGISTRAR', roleColor: '#9ca3af', dots: [true, true, true, false, false] },
];

const dotColors = ['#22c55e', '#22c55e', '#22c55e', '#f97316', '#6b7280'];

const trafficData = [
  { t: '1', api: 40, auth: 20 }, { t: '2', api: 55, auth: 30 }, { t: '3', api: 45, auth: 25 },
  { t: '4', api: 70, auth: 40 }, { t: '5', api: 85, auth: 50 }, { t: '6', api: 75, auth: 45 },
  { t: '7', api: 60, auth: 35 }, { t: '8', api: 50, auth: 28 }, { t: '9', api: 40, auth: 20 },
  { t: '10', api: 30, auth: 15 },
];

const errorData = [
  { t: 'Jan', v: 80 }, { t: 'Feb', v: 70 }, { t: 'Mar', v: 60 }, { t: 'Apr', v: 55 },
  { t: 'May', v: 50 }, { t: 'Jun', v: 45 }, { t: 'Jul', v: 40 }, { t: 'Aug', v: 38 },
];

const UserRoles = () => (
  <div>
    <h1 className="text-2xl font-bold text-gray-900 mb-6">User &amp; Role Management</h1>

    <div className="grid grid-cols-3 gap-5 mb-5">
      {/* User Table */}
      <div className="col-span-2">
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: '#f5a623' }}>Global User Provisioning &amp; Roles</h2>
              <span className="text-xs text-gray-400">(Master Control)</span>
            </div>
            <div className="flex gap-2">
              <button className="p-1.5 rounded border" style={{ borderColor: '#e5e0d5' }}>≡</button>
              <button className="p-1.5 rounded border" style={{ borderColor: '#e5e0d5' }}>⋮</button>
            </div>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                {['USER ID', 'NAME', 'DEPARTMENT', 'ROLE', 'PERMISSIONS'].map((h) => (
                  <th key={h} className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                  <td className="py-3 pr-3 text-gray-400">{u.id}</td>
                  <td className="py-3 pr-3 font-bold text-gray-900">{u.name}</td>
                  <td className="py-3 pr-3 text-gray-500">{u.dept}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {u.role.split(' ').reduce((acc, word, i, arr) => {
                        if (i === 0 && arr.length > 2) {
                          acc.push(
                            <span key="a" className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: u.roleColor }}>
                              {arr.slice(0, 2).join(' ')}
                            </span>
                          );
                        } else if (i === 2) {
                          acc.push(
                            <span key="b" className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: u.roleColor }}>
                              {arr.slice(2).join(' ')}
                            </span>
                          );
                        }
                        return acc;
                      }, [])}
                      {u.role.split(' ').length <= 2 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: u.roleColor }}>{u.role}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {u.dots.map((active, i) => (
                        <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: active ? dotColors[i] : '#e5e0d5' }} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs" style={{ borderColor: '#f0ede6' }}>
            <span className="text-gray-400">Showing 3 of 1,248 users</span>
            <div className="flex gap-2">
              <button className="p-1.5 rounded border text-gray-400" style={{ borderColor: '#e5e0d5' }}><ChevronLeft size={14} /></button>
              <button className="p-1.5 rounded border text-gray-400" style={{ borderColor: '#e5e0d5' }}><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: User Flow Stats */}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <h2 className="text-sm font-bold text-gray-900 mb-1">Institutional User Flow &amp; Permissions</h2>
          <p className="text-[10px] text-gray-400 mb-4 uppercase tracking-widest">(Audit Trail Funnel)</p>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Total Onboarded', value: '4,892' },
              { label: 'Active Sessions', value: '1,204' },
              { label: 'Admin Privileges', value: '84' },
              { label: 'Super Admins', value: '12' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3 rounded-lg text-white" style={{ background: '#1a2233' }}>
                <span className="text-xs">{label}</span>
                <span className="text-lg font-extrabold" style={{ color: '#f5a623' }}>{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#f0ede6' }}>
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <div>
                <div className="font-semibold text-gray-800">New Role Provisioned</div>
                <div className="text-gray-400 text-[10px]">2MINS AGO · REGISTRAR</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#f0ede6' }}>
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <div>
                <div className="font-semibold text-gray-800">Permission Revocation</div>
                <div className="text-gray-400 text-[10px]">14 MINS AGO · USR-9012</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom charts */}
    <div className="grid grid-cols-2 gap-5">
      {/* Traffic */}
      <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">System Traffic Monitoring</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#c8b89a' }} />API Load</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" />User Auth</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={trafficData} barGap={2}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0ede6" />
            <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ background: '#1a2233', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }} />
            <Bar dataKey="api" fill="#c8b89a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="auth" fill="#d8d0c8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Error trend */}
      <div className="rounded-xl p-5 shadow-sm relative" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Error Reporting Trend</h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#dcfce7', color: '#15803d' }}>-12% YoY</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={errorData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0ede6" />
            <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ background: '#1a2233', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }} />
            <Line type="monotone" dataKey="v" stroke="#f5a623" strokeWidth={2.5} dot={{ r: 4, fill: '#f5a623' }} />
          </LineChart>
        </ResponsiveContainer>
        <button
          className="absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md"
          style={{ background: '#1a2233' }}
        >
          <UserPlus size={16} />
        </button>
        <div className="flex justify-between text-[10px] text-gray-400 mt-2 uppercase tracking-wider px-1">
          {['Resolved', 'Avg Response', 'Security Flag'].map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default UserRoles;
