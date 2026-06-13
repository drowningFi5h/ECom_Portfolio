'use client';

import { useState, useTransition } from 'react';
import { Trash2, Eye, MailOpen, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { updateStatus, deleteSubmission } from './actions';
import type { Submission, SubmissionStatus } from '@/lib/supabase';

const FILTERS = ['all', 'new', 'read', 'archived'] as const;
type Filter = typeof FILTERS[number];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SubmissionsTable({ submissions }: { submissions: Submission[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [viewing, setViewing] = useState<Submission | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = filter === 'all' ? submissions : submissions.filter(s => s.status === filter);

  function handleStatus(id: string, status: SubmissionStatus) {
    startTransition(() => updateStatus(id, status));
  }

  function handleDelete(id: string) {
    startTransition(() => deleteSubmission(id));
    setConfirming(null);
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f}
            <span className="ml-1.5 text-xs opacity-60">
              {f === 'all' ? submissions.length : submissions.filter(s => s.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No submissions in this category.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(sub => (
                <TableRow key={sub.id} className={sub.status === 'new' ? 'font-medium' : ''}>
                  <TableCell className="text-slate-500 text-xs whitespace-nowrap">{fmt(sub.created_at)}</TableCell>
                  <TableCell>{sub.name}</TableCell>
                  <TableCell>
                    <a href={`mailto:${sub.email}`} className="text-blue-600 hover:underline text-sm">{sub.email}</a>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-[160px] truncate">{sub.service}</TableCell>
                  <TableCell>
                    <Badge variant={sub.status}>{sub.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="View message" onClick={() => setViewing(sub)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {sub.status !== 'read' && sub.status !== 'archived' && (
                        <Button variant="ghost" size="icon" title="Mark as read" disabled={isPending} onClick={() => handleStatus(sub.id, 'read')}>
                          <MailOpen className="h-4 w-4" />
                        </Button>
                      )}
                      {sub.status !== 'archived' && (
                        <Button variant="ghost" size="icon" title="Archive" disabled={isPending} onClick={() => handleStatus(sub.id, 'archived')}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {sub.status === 'archived' && (
                        <Button variant="ghost" size="icon" title="Restore to new" disabled={isPending} onClick={() => handleStatus(sub.id, 'new')}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Delete" disabled={isPending} onClick={() => setConfirming(sub.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View message dialog */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        {viewing && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{viewing.name}</DialogTitle>
              <DialogDescription>
                <a href={`mailto:${viewing.email}`} className="text-blue-600 hover:underline">{viewing.email}</a>
                {' · '}{viewing.service}{' · '}{fmt(viewing.created_at)}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border rounded-lg p-4 bg-slate-50">
              {viewing.message}
            </p>
            <DialogFooter>
              {viewing.status === 'new' && (
                <Button size="sm" onClick={() => { handleStatus(viewing.id, 'read'); setViewing(null); }}>
                  Mark as read
                </Button>
              )}
              <DialogClose asChild>
                <Button variant="outline" size="sm">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirming} onOpenChange={open => !open && setConfirming(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete submission?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" size="sm" disabled={isPending} onClick={() => confirming && handleDelete(confirming)}>
              Delete
            </Button>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
