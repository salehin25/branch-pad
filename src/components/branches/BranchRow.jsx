import React, { Fragment, useMemo, useState } from 'react';

const STATUS_CONFIG = {
  draft:     { icon: '🔵', label: 'Draft',      bg: 'bg-blue-50',   border: 'border-blue-200' },
  ready:     { icon: '🟡', label: 'Ready',      bg: 'bg-amber-50',  border: 'border-amber-200' },
  approved:  { icon: '🟢', label: 'Approved',   bg: 'bg-green-50',  border: 'border-green-200' },
  comments:  { icon: '🟣', label: 'Comments',   bg: 'bg-purple-50', border: 'border-purple-200' },
  merged:    { icon: '✅', label: 'Merged',     bg: 'bg-gray-50',   border: 'border-gray-200' },
  unknown:   { icon: '⚪', label: 'No PR',      bg: 'bg-gray-50',   border: 'border-gray-200' },
};

function getPrStatus(pr) {
  if (!pr) return 'unknown';
  if (pr.merged_at) return 'merged';
  if (pr.is_draft) return 'draft';
  if (pr.pending_comments_count > 0) return 'comments';
  if (pr.approvals_count > 0) return 'approved';
  return 'ready';
}

function copyToClipboard(text) {
  window.api.clipboard.write(String(text));
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function BranchRow({ branch, repo, onRemove }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // comment id being replied to
  const [replyText, setReplyText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pr = branch.pull_request || null;
  const status = getPrStatus(pr);
  const cfg = STATUS_CONFIG[status];

  const fetchComments = async () => {
    if (!pr || !repo) return;
    setCommentsLoading(true);
    setErrorMsg('');
    try {
      const data = await window.api.gh.prComments({
        repo: `${repo.owner}/${repo.name}`,
        prNumber: pr.number,
      });
      setComments(data || []);
    } catch (e) {
      setErrorMsg('Failed to load comments: ' + e.message);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleToggleComments = () => {
    if (showComments) {
      setShowComments(false);
    } else {
      setShowComments(true);
      if (comments.length === 0) fetchComments();
    }
  };

  // Nest replies under their parent review comment so the conversation
  // reads as a thread instead of a flat, date-sorted list.
  const threads = useMemo(() => {
    const roots = [];
    const byParent = new Map();
    for (const c of comments) {
      if (c.inReplyToId) {
        const arr = byParent.get(c.inReplyToId) || [];
        arr.push(c);
        byParent.set(c.inReplyToId, arr);
      } else {
        roots.push(c);
      }
    }
    return roots.map((c) => ({ ...c, replies: byParent.get(c.id) || [] }));
  }, [comments]);

  const runPost = async ({ body, inReplyToId }) => {
    if (!repo || !pr) return;
    setSending(true);
    setErrorMsg('');
    try {
      const res = await window.api.gh.prCommentReply({
        repo: `${repo.owner}/${repo.name}`,
        prNumber: pr.number,
        body,
        inReplyToId,
      });
      if (!res || res.ok !== true) {
        const reason = res?.error || 'unknown error';
        // Friendly hint for the common "body has unquoted spaces" failure.
        setErrorMsg(`Reply failed: ${reason}`);
        return false;
      }
      await fetchComments();
      return true;
    } catch (e) {
      setErrorMsg(`Reply failed: ${e.message}`);
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (commentId) => {
    const text = replyText.trim();
    if (!text) return;
    const ok = await runPost({ body: text, inReplyToId: commentId });
    if (ok) {
      setReplyText('');
      setReplyTo(null);
    }
  };

  const handleSendComment = async () => {
    const text = newCommentText.trim();
    if (!text) return;
    const ok = await runPost({ body: text, inReplyToId: null });
    if (ok) setNewCommentText('');
  };

  const renderCommentBody = (c) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="font-semibold text-gray-900">{c.author}</span>
        <span className="text-gray-400">{timeAgo(c.createdAt)}</span>
        {c.type === 'review' && c.path && (
          <span className="text-gray-400 font-mono text-[10px]">
            📁 {c.path}{c.line ? `:${c.line}` : ''}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>

      {/* Reply affordance */}
      {replyTo === c.id ? (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendReply(c.id);
              }
            }}
            placeholder={`Reply to ${c.author}…`}
            autoFocus
            disabled={sending}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={() => handleSendReply(c.id)}
            disabled={sending || !replyText.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-40"
          >
            {sending ? '…' : 'Send'}
          </button>
          <button
            onClick={() => { setReplyTo(null); setReplyText(''); }}
            className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setReplyTo(c.id); setReplyText(''); setErrorMsg(''); }}
          className="text-[11px] text-blue-500 hover:text-blue-700 mt-1"
        >
          ↩ Reply
        </button>
      )}
    </div>
  );

  return (
    <div className={`border rounded-lg p-4 shadow-sm ${cfg.bg} ${cfg.border} transition-all`}>
      {/* Row header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-semibold text-gray-900 truncate">
              {branch.name}
            </span>
            <span className="text-xs font-medium whitespace-nowrap">{cfg.icon} {cfg.label}</span>
            {pr && pr.approvals_count > 0 && (
              <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                👍 {pr.approvals_count}
              </span>
            )}
            {pr && (
              <button
                onClick={handleToggleComments}
                title={showComments ? 'Hide comments' : 'View comments'}
                className={`text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  showComments
                    ? 'bg-purple-600 text-white'
                    : pr.pending_comments_count > 0
                      ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
              >
                💬 {pr.pending_comments_count > 0 ? pr.pending_comments_count : ''}
              </button>
            )}
          </div>

          {pr ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="font-medium">PR #{pr.number}</span>
              <span className="truncate max-w-md">{pr.title}</span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-gray-500 italic">No PR found for this branch</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {pr && (
            <>
              <button
                title="Copy branch name"
                onClick={() => copyToClipboard(branch.name)}
                className="p-1.5 rounded hover:bg-black/5 text-gray-600 text-sm"
              >
                🌿
              </button>
              <button
                title="Copy PR number"
                onClick={() => copyToClipboard(pr.number)}
                className="p-1.5 rounded hover:bg-black/5 text-gray-600 text-sm"
              >
                #
              </button>
              <button
                title="Copy PR URL"
                onClick={() => copyToClipboard(pr.html_url)}
                className="p-1.5 rounded hover:bg-black/5 text-gray-600 text-sm"
              >
                🔗
              </button>
              <button
                title="Open PR in browser"
                onClick={() => window.open(pr.html_url, '_blank')}
                className="p-1.5 rounded hover:bg-black/5 text-gray-600 text-sm"
              >
                🌐
              </button>
            </>
          )}
          <button
            title="Remove branch"
            onClick={onRemove}
            className="p-1.5 rounded hover:bg-red-100 text-red-500 hover:text-red-700 text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-2">
              ⚠️ {errorMsg}
            </p>
          )}

          {commentsLoading ? (
            <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
              <span className="animate-spin">⏳</span> Loading comments…
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-3">No comments yet.</p>
          ) : (
            <div className="space-y-0 max-h-[400px] overflow-y-auto">
              {threads.map((c) => (
                <Fragment key={c.id}>
                  <div className="flex gap-2 py-2 border-b border-gray-100">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 mt-0.5">
                      {c.author?.[0]?.toUpperCase() || '?'}
                    </div>
                    {renderCommentBody(c)}
                  </div>
                  {c.replies.map((r) => (
                    <div
                      key={r.id}
                      className="flex gap-2 py-2 pl-10 ml-3 border-l-2 border-purple-100 border-b border-gray-100"
                    >
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0 mt-0.5">
                        {r.author?.[0]?.toUpperCase() || '?'}
                      </div>
                      {renderCommentBody(r)}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          )}

          {/* New comment box */}
          {pr && (
            <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                placeholder="Write a comment…"
                disabled={sending}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleSendComment}
                disabled={sending || !newCommentText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
              >
                {sending ? '…' : 'Comment'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}