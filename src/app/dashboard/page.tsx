import { getSubmissions } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubmissionsTable from './SubmissionsTable';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { data: submissions, error } = await getSubmissions();

  if (error) {
    return (
      <div className="p-8 text-red-600">
        Failed to load submissions: {error.message}
      </div>
    );
  }

  const all = submissions ?? [];
  const stats = [
    { label: 'Total',    value: all.length,                                      color: 'text-slate-900' },
    { label: 'New',      value: all.filter(s => s.status === 'new').length,      color: 'text-blue-600'  },
    { label: 'Read',     value: all.filter(s => s.status === 'read').length,     color: 'text-green-600' },
    { label: 'Archived', value: all.filter(s => s.status === 'archived').length, color: 'text-slate-400' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <SubmissionsTable submissions={all} />
    </div>
  );
}
