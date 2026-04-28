import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api/axios';
import { BeltBadge } from '../components/BeltBadge';
import { StudentModal, studentBelts, type StudentModalValues } from '../components/StudentModal';
import { getStudentBelt, getStudentName, type Student } from '../types/student';

const beltFilters = ['All', ...studentBelts];

const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function getJoinDate(student: Student) {
  const metadata = student.metadata ?? {};
  const joinDate = metadata.join_date ?? metadata.joinDate ?? metadata.created_at;

  return typeof joinDate === 'string' && joinDate.trim() ? joinDate : '-';
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return {
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' '),
  };
}

export function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeBelt, setActiveBelt] = useState('All');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadStudents() {
    const response = await api.get('/students');
    setStudents(response.data ?? []);
  }

  useEffect(() => {
    void loadStudents().catch(() => setError('Unable to load students.'));
  }, []);

  const filteredStudents = useMemo(() => {
    if (activeBelt === 'All') {
      return students;
    }

    return students.filter((student) => getStudentBelt(student).toLowerCase().includes(activeBelt.toLowerCase()));
  }, [activeBelt, students]);

  const openAddModal = () => {
    setSelectedStudent(null);
    setModalMode('add');
    setError('');
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setModalMode('edit');
    setError('');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedStudent(null);
    setError('');
  };

  const handleSubmit = async (values: StudentModalValues) => {
    setIsSaving(true);
    setError('');
    const { first_name, last_name } = splitName(values.name);

    const payload = {
      first_name,
      last_name,
      status: selectedStudent?.status ?? 'Active',
      metadata: {
        email: values.email.trim() || null,
        belt_label: values.belt_rank,
      },
    };

    try {
      if (modalMode === 'edit' && selectedStudent) {
        await api.patch(`/students/${selectedStudent.id}`, payload);
      } else {
        await api.post('/students', {
          ...payload,
          membership_id: `GAMA-${Date.now()}`,
          metadata: {
            ...payload.metadata,
            join_date: new Date().toISOString().slice(0, 10),
          },
        });
      }

      await loadStudents();
      closeModal();
    } catch (saveError: any) {
      setError(saveError.response?.data?.message ?? saveError.message ?? 'Unable to save student.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSoftDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    setError('');
    try {
      await api.delete(`/students/${studentToDelete.id}`);
      await loadStudents();
      setStudentToDelete(null);
    } catch (deleteError: any) {
      setError(deleteError.response?.data?.message ?? deleteError.message ?? 'Unable to delete student.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.section className="page-stack" variants={pageVariants} initial="hidden" animate="show">
      <motion.div className="page-header" variants={itemVariants}>
        <div>
          <p className="eyebrow">Roster</p>
          <h1>Students</h1>
          <p>Manage academy members, belt levels, and active roster status.</p>
        </div>
        <button className="primary-button add-student-button" type="button" onClick={openAddModal}>
          <Plus size={18} />
          Add Student
        </button>
      </motion.div>

      <motion.div className="filter-chips" variants={itemVariants}>
        {beltFilters.map((belt) => (
          <button
            key={belt}
            className={activeBelt === belt ? 'active' : ''}
            type="button"
            onClick={() => setActiveBelt(belt)}
          >
            {belt}
          </button>
        ))}
      </motion.div>

      {error && <p className="form-error">{error}</p>}

      <motion.article className="card table-card" variants={itemVariants}>
        <table className="roster-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Belt</th>
              <th>Join Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td>
                  <strong>{getStudentName(student)}</strong>
                  <span>{student.membership_id ?? 'No membership ID'}</span>
                </td>
                <td><BeltBadge belt={getStudentBelt(student)} /></td>
                <td>{getJoinDate(student)}</td>
                <td>
                  <span className={student.status === 'Inactive' ? 'status-pill inactive' : 'status-pill'}>
                    {student.status ?? 'Active'}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button type="button" onClick={() => openEditModal(student)}>
                      <Edit3 size={16} />
                      Edit
                    </button>
                    <button className="danger" type="button" onClick={() => setStudentToDelete(student)}>
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStudents.length === 0 && (
          <div className="empty-table">
            <h2>No students in this filter</h2>
            <p>Add a student or select another belt filter.</p>
          </div>
        )}
      </motion.article>

      <AnimatePresence>
        {modalMode && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StudentModal
              mode={modalMode}
              student={selectedStudent}
              isSaving={isSaving}
              onClose={closeModal}
              onSubmit={(values) => void handleSubmit(values)}
            />
          </motion.div>
        )}

        {studentToDelete && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="confirm-dialog card"
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
            >
              <div className="confirm-icon">
                <Trash2 size={24} />
              </div>
              <h2>Soft delete student?</h2>
              <p>
                {getStudentName(studentToDelete)} will be removed from the active roster but can be restored later.
              </p>
              <div className="confirm-actions">
                <button type="button" onClick={() => setStudentToDelete(null)} disabled={isDeleting}>
                  Cancel
                </button>
                <button className="danger-button" type="button" onClick={() => void confirmSoftDelete()} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Soft Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
