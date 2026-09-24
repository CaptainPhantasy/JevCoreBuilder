import React, { useState } from 'react';
import { Copy, Check, Eye, Columns, AlignJustify } from 'lucide-react';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

interface VisualDiffViewerProps {
  filename: string;
  oldContent: string;
  newContent: string;
  onClose?: () => void;
}

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: DiffLine[] = [];

  // Simple and robust LCS-based or lookahead line matching
  let i = 0;
  let j = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push({
        type: 'unchanged',
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
        content: oldLines[i]
      });
      i++;
      j++;
    } else {
      // Check if old line exists further down in newLines
      const newIndex = newLines.indexOf(oldLines[i], j);
      const oldIndex = oldLines.indexOf(newLines[j], i);

      if (i < oldLines.length && (newIndex === -1 || (oldIndex !== -1 && oldIndex < newIndex))) {
        diff.push({
          type: 'removed',
          oldLineNumber: oldLineNum++,
          content: oldLines[i]
        });
        i++;
      } else if (j < newLines.length) {
        diff.push({
          type: 'added',
          newLineNumber: newLineNum++,
          content: newLines[j]
        });
        j++;
      } else {
        diff.push({
          type: 'removed',
          oldLineNumber: oldLineNum++,
          content: oldLines[i]
        });
        i++;
      }
    }
  }

  return diff;
}

export default function VisualDiffViewer({ filename, oldContent, newContent, onClose }: VisualDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [copied, setCopied] = useState(false);

  const diffLines = computeLineDiff(oldContent, newContent);
  const additions = diffLines.filter(d => d.type === 'added').length;
  const deletions = diffLines.filter(d => d.type === 'removed').length;

  const copyFullDiff = () => {
    const raw = diffLines
      .map(d => (d.type === 'added' ? `+ ${d.content}` : d.type === 'removed' ? `- ${d.content}` : `  ${d.content}`))
      .join('\n');
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full font-mono text-xs">
      {/* Diff Header */}
      <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-zinc-200">{filename}</span>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-emerald-400 font-bold">+{additions}</span>
            <span className="text-rose-400 font-bold">-{deletions}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'unified' ? 'split' : 'unified')}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {viewMode === 'unified' ? <Columns className="w-3.5 h-3.5" /> : <AlignJustify className="w-3.5 h-3.5" />}
            <span>{viewMode === 'unified' ? 'Split View' : 'Unified View'}</span>
          </button>

          <button
            onClick={copyFullDiff}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Patch'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 px-2 py-1 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Diff Body */}
      <div className="flex-1 overflow-auto p-2 bg-zinc-950/90 leading-5">
        {diffLines.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">No differences detected. Files are byte-identical.</div>
        ) : (
          diffLines.map((line, idx) => {
            const isAdded = line.type === 'added';
            const isRemoved = line.type === 'removed';

            return (
              <div
                key={idx}
                className={`flex items-start text-[11px] font-mono px-2 py-0.5 rounded-xs transition-colors ${
                  isAdded
                    ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                    : isRemoved
                    ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500'
                    : 'text-zinc-400 hover:bg-zinc-900/60'
                }`}
              >
                <div className="w-10 select-none text-right pr-2 text-zinc-600 shrink-0">
                  {line.oldLineNumber || ''}
                </div>
                <div className="w-10 select-none text-right pr-3 text-zinc-600 shrink-0">
                  {line.newLineNumber || ''}
                </div>
                <div className="w-4 select-none text-center shrink-0 font-bold">
                  {isAdded ? '+' : isRemoved ? '-' : ' '}
                </div>
                <div className="flex-1 whitespace-pre overflow-x-auto">{line.content || ' '}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
