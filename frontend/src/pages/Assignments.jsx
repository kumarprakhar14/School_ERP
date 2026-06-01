import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import { BookOpen, Plus, FileText, Calendar } from 'lucide-react';

export default function Assignments() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(null);
  
  const [formData, setFormData] = useState({ title: '', description: '', dueDate: '', classId: '', sectionId: '', file: null });
  const [submitFile, setSubmitFile] = useState(null);
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lazy loading submissions states
  const [expandedAssignmentId, setExpandedAssignmentId] = useState(null);
  const [submissionsMap, setSubmissionsMap] = useState({});
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const handleToggleSubmissions = async (assignmentId) => {
    if (expandedAssignmentId === assignmentId) {
      setExpandedAssignmentId(null);
      return;
    }
    setExpandedAssignmentId(assignmentId);
    if (!submissionsMap[assignmentId]) {
      setLoadingSubmissions(true);
      try {
        const res = await api.get(`/assignments/${assignmentId}/submissions`);
        setSubmissionsMap(prev => ({ ...prev, [assignmentId]: res.data }));
      } catch (error) {
        toast.error('Failed to load submissions');
      } finally {
        setLoadingSubmissions(false);
      }
    }
  };

  useEffect(() => {
    fetchAssignments();
    if (user?.role === 'TEACHER' || user?.role === 'ADMIN') {
      fetchClasses();
    }
  }, [user]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assignments');
      setAssignments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('dueDate', formData.dueDate);
    data.append('classId', formData.classId);
    if (formData.sectionId) data.append('sectionId', formData.sectionId);
    if (formData.file) data.append('file', formData.file);

    try {
      await api.post('/assignments', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowAddModal(false);
      setFormData({ title: '', description: '', dueDate: '', classId: '', sectionId: '', file: null });
      fetchAssignments();
    } catch (error) {
      alert('Failed to post assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData();
    if (submitFile) data.append('file', submitFile);
    if (submitUrl) data.append('fileUrl', submitUrl);

    try {
      await api.post(`/assignments/${showSubmitModal}/submit`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowSubmitModal(null);
      setSubmitFile(null);
      setSubmitUrl('');
      fetchAssignments();
      toast.success('Assignment submitted successfully');
    } catch (error) {
      toast.error('Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-sm border border-indigo-200/50">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Assignments</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage classwork and homework</p>
          </div>
        </div>
        
        {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> New Assignment
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map(assign => (
            <div key={assign.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all group">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{assign.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{assign.description}</p>
              
              <div className="flex items-center text-sm text-gray-500 mb-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                <span className="font-medium">Due: {new Date(assign.dueDate).toLocaleDateString()}</span>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                <div className="text-xs text-gray-500 font-medium">
                  By {assign.teacher?.name} • Class {assign.class?.name} {assign.section ? `(${assign.section.name})` : ''}
                </div>
                
                {assign.fileUrl && (
                  <a href={assign.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center">
                    <FileText className="w-4 h-4 mr-1" /> View Resource
                  </a>
                )}
              </div>

              {user?.role === 'STUDENT' ? (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  {assign.submissions?.length > 0 ? (
                    <div className="flex items-center text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                      ✓ Submitted
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowSubmitModal(assign.id)}
                      className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-medium text-sm transition-colors"
                    >
                      Turn In Work
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-gray-700">Submissions ({assign._count?.submissions || 0})</h4>
                    {(assign._count?.submissions || 0) > 0 && (
                      <button 
                        onClick={() => handleToggleSubmissions(assign.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none"
                      >
                        {expandedAssignmentId === assign.id ? 'Hide Submissions' : 'View Submissions'}
                      </button>
                    )}
                  </div>
                  
                  {expandedAssignmentId === assign.id && (
                    <div className="mt-2 space-y-2">
                      {loadingSubmissions && !submissionsMap[assign.id] ? (
                        <div className="text-xs text-gray-500 italic py-2 flex items-center justify-center">
                          <span className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-2"></span>
                          Loading submissions...
                        </div>
                      ) : submissionsMap[assign.id] && submissionsMap[assign.id].length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {submissionsMap[assign.id].map(sub => (
                            <div key={sub.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                              <div>
                                <p className="text-sm font-bold text-gray-900">{sub.student?.name}</p>
                                <p className="text-xs text-gray-500 font-mono">{sub.student?.erpId}</p>
                              </div>
                              <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center">
                                <FileText className="w-3 h-3 mr-1" /> View
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No submissions yet.</p>
                      )}
                    </div>
                  )}
                  {(!assign._count?.submissions || assign._count.submissions === 0) && (
                    <p className="text-xs text-gray-500 italic">No submissions yet.</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {assignments.length === 0 && (
            <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 border-dashed">
              No assignments found.
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold">New Assignment</h2>
            </div>
            <form onSubmit={handleCreateAssignment} className="p-5 space-y-4">
              <input required type="text" placeholder="Title" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full p-2.5 border rounded-xl" />
              <textarea required rows="3" placeholder="Instructions" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full p-2.5 border rounded-xl"></textarea>
              <input required type="date" value={formData.dueDate} onChange={e=>setFormData({...formData, dueDate: e.target.value})} className="w-full p-2.5 border rounded-xl" />
              
              <select required value={formData.classId} onChange={e=>setFormData({...formData, classId: e.target.value, sectionId: ''})} className="w-full p-2.5 border rounded-xl bg-white">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select value={formData.sectionId} onChange={e=>setFormData({...formData, sectionId: e.target.value})} disabled={!formData.classId} className="w-full p-2.5 border rounded-xl bg-white disabled:opacity-50">
                <option value="">Select Section (Optional)</option>
                {formData.classId && classes.find(c => c.id === formData.classId)?.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <input type="file" onChange={e=>setFormData({...formData, file: e.target.files[0]})} className="w-full p-2 border rounded-xl text-sm" />
              
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-50">{submitting ? 'Posting...' : 'Post Assignment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold">Submit Assignment</h2>
            </div>
            <form onSubmit={handleSubmitAssignment} className="p-5 space-y-4">
              <input type="url" placeholder="Paste URL (Google Drive, Docs, etc.)" value={submitUrl} onChange={e=>setSubmitUrl(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
              <div className="text-center text-sm font-medium text-gray-500">OR</div>
              <input type="file" onChange={e=>setSubmitFile(e.target.files[0])} className="w-full p-2 border rounded-xl text-sm" />
              
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowSubmitModal(null)} className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{submitting ? 'Submitting...' : 'Turn In'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
