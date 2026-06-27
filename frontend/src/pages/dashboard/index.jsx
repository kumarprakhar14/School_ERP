import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { toast } from 'sonner';

import AdminDashboard from './AdminDashboard';
import GeneralDashboard from './GeneralDashboard';
import AccountsDashboard from './AccountsDashboard';
import FallbackDashboard from './FallbackDashboard';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // New/Edit Notice State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRoles, setTargetRoles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [isDispatchExpanded, setIsDispatchExpanded] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  
  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, noticeId: null });

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [noticeRes, statsRes] = await Promise.all([
        api.get('/notices'),
        api.get('/dashboard/stats').catch(() => ({ data: null }))
      ]);
      setNotices(noticeRes.data || []);
      if (statsRes.data) {
        const data = statsRes.data;
        if (typeof data.feesCollected === 'number') data.feesCollected /= 100;
        if (typeof data.pendingFees === 'number') data.pendingFees /= 100;
        if (data.financialSnapshot) {
          if (typeof data.financialSnapshot.feesCollected === 'number') data.financialSnapshot.feesCollected /= 100;
          if (typeof data.financialSnapshot.pendingFees === 'number') data.financialSnapshot.pendingFees /= 100;
        }
        setStats(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostNotice = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      const allRoles = ['TEACHER', 'STUDENT', 'ACCOUNTS'];
      const isAllSelected = allRoles.every(role => targetRoles.includes(role));
      const payloadRoles = isAllSelected ? [] : targetRoles;

      if (editingNoticeId) {
        await api.put(`/notices/${editingNoticeId}`, { title, content, targetRoles: payloadRoles });
        toast.success('Notice updated successfully');
      } else {
        await api.post('/notices', { title, content, targetRoles: payloadRoles });
        toast.success('Notice posted successfully');
      }
      resetNoticeForm();
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      toast.error(editingNoticeId ? 'Failed to update notice' : 'Failed to post notice');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteNotice = (id) => {
    setDeleteConfirm({ isOpen: true, noticeId: id });
  };

  const confirmDeleteNotice = async () => {
    const id = deleteConfirm.noticeId;
    if (!id) return;
    try {
      await api.delete(`/notices/${id}`);
      toast.success('Notice deleted successfully');
      if (editingNoticeId === id) resetNoticeForm();
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete notice');
    } finally {
      setDeleteConfirm({ isOpen: false, noticeId: null });
    }
  };

  const startEditingNotice = (notice) => {
    setEditingNoticeId(notice.id);
    setTitle(notice.title);
    setContent(notice.content);
    setTargetRoles(notice.targetRoles || []);
    setIsDispatchExpanded(true);
    // Scroll to form
    setTimeout(() => {
      const el = document.getElementById('post-notice');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const resetNoticeForm = () => {
    setEditingNoticeId(null);
    setTitle('');
    setContent('');
    setTargetRoles([]);
    setIsDispatchExpanded(false);
  };

  // -----------------------------------------------------------------------------
  // MASTER ROOT RENDER
  // -----------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-transparent">
        <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
      </div>
    );
  }

  // Accounts role has its own self-contained dashboard with independent data fetching
  if (user?.role === 'ACCOUNTS') {
    return <AccountsDashboard />;
  }

  // For roles that depend on shared stats — show fallback if stats failed to load
  if (!stats) {
    return <FallbackDashboard onRetry={fetchDashboardData} />;
  }

  // Route role views
  if (user?.role === 'ADMIN') {
    return (
      <>
        <AdminDashboard
          stats={stats}
          notices={notices}
          user={user}
          navigate={navigate}
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          targetRoles={targetRoles}
          setTargetRoles={setTargetRoles}
          posting={posting}
          handlePostNotice={handlePostNotice}
          isDispatchExpanded={isDispatchExpanded}
          setIsDispatchExpanded={setIsDispatchExpanded}
          editingNoticeId={editingNoticeId}
          resetNoticeForm={resetNoticeForm}
          handleDeleteNotice={handleDeleteNotice}
          startEditingNotice={startEditingNotice}
        />
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Delete Notice"
          message="Are you sure you want to delete this notice? This action cannot be undone."
          confirmText="Yes, Delete"
          onConfirm={confirmDeleteNotice}
          onCancel={() => setDeleteConfirm({ isOpen: false, noticeId: null })}
        />
      </>
    );
  }

  // Fallback / Preserved Views for STUDENT and TEACHER
  return (
    <>
      <GeneralDashboard
        stats={stats}
        notices={notices}
        user={user}
        navigate={navigate}
        loading={loading}
        title={title}
        setTitle={setTitle}
        content={content}
        setContent={setContent}
        targetRoles={targetRoles}
        setTargetRoles={setTargetRoles}
        posting={posting}
        handlePostNotice={handlePostNotice}
        editingNoticeId={editingNoticeId}
        resetNoticeForm={resetNoticeForm}
        handleDeleteNotice={handleDeleteNotice}
        startEditingNotice={startEditingNotice}
      />
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Notice"
        message="Are you sure you want to delete this notice? This action cannot be undone."
        confirmText="Yes, Delete"
        onConfirm={confirmDeleteNotice}
        onCancel={() => setDeleteConfirm({ isOpen: false, noticeId: null })}
      />
    </>
  );
}
